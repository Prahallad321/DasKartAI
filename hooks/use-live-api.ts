import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData, blobToBase64 } from '../utils/audio-utils';
import { VoiceId } from '../types';

interface UseLiveApiProps {
  onConnectionChange?: (connected: boolean) => void;
  onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean) => void;
  voiceName?: VoiceId;
  systemInstruction?: string;
}

export function useLiveApi({ onConnectionChange, onTranscript, voiceName = 'Puck', systemInstruction }: UseLiveApiProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0); // For visualizer

  // Refs for callbacks to handle stale closures
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onTranscriptRef.current = onTranscript;
  }, [onConnectionChange, onTranscript]);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  // Stream & Nodes
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  const sessionRef = useRef<Promise<any> | null>(null);

  // Video State
  const videoIntervalRef = useRef<number | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanup = useCallback(() => {
    // Stop video streaming
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    // Close session
    sessionRef.current?.then(session => {
        try {
            session.close();
        } catch (e) {
            console.warn("Error closing session", e);
        }
    });
    sessionRef.current = null;

    // Stop Microphones
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect Nodes
    inputSourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Close Contexts
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;

    setIsConnected(false);
    onConnectionChangeRef.current?.(false);
    setVolume(0);
  }, []);

  const connect = useCallback(async (videoElement?: HTMLVideoElement) => {
    try {
      setIsError(null);
      
      // Initialize Audio Contexts
      // Input: 16kHz for Gemini compatibility
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for high quality response
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Setup Visualizer Analyser
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;

      // Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup Input Pipeline
      const inputSource = inputAudioContextRef.current.createMediaStreamSource(stream);
      inputSourceRef.current = inputSource;
      
      // Connect input to analyser for visualization
      inputSource.connect(inputAnalyserRef.current);

      const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      inputSource.connect(processor);
      processor.connect(inputAudioContextRef.current.destination);

      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config: any = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: systemInstruction || "You are Nova, a helpful, witty, and friendly AI assistant. You speak naturally, like a human, with concise responses. You can see what the user shows you via camera if enabled.",
          inputAudioTranscription: { model: "google_provided_model" }, 
          outputAudioTranscription: { model: "google_provided_model" },
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setIsConnected(true);
            onConnectionChangeRef.current?.(true);
            
            // Start processing audio input
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
              
              // Simple volume meter for input
              const dataArray = new Uint8Array(inputAnalyserRef.current!.frequencyBinCount);
              inputAnalyserRef.current!.getByteFrequencyData(dataArray);
              const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
              setVolume(avg); 
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              onTranscriptRef.current?.(message.serverContent.outputTranscription.text, 'model', false);
            }
            if (message.serverContent?.inputTranscription) {
              onTranscriptRef.current?.(message.serverContent.inputTranscription.text, 'user', false);
            }
            if (message.serverContent?.turnComplete) {
              onTranscriptRef.current?.('', 'model', true);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyserRef.current!); // Connect to analyser (which connects to dest)
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Interrupted");
              sourcesRef.current.forEach(source => {
                source.stop();
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session Closed");
            cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setIsError("Connection error. Please try again.");
            cleanup();
          }
        }
      });

      sessionRef.current = sessionPromise;

      // Handle Video Streaming if element provided
      if (videoElement) {
        if (!videoCanvasRef.current) {
            videoCanvasRef.current = document.createElement('canvas');
        }
        const canvas = videoCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        videoIntervalRef.current = window.setInterval(() => {
            if (canvas && ctx && videoElement.readyState >= 2) {
                canvas.width = videoElement.videoWidth / 4; // Downscale for performance
                canvas.height = videoElement.videoHeight / 4;
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const base64Data = await blobToBase64(blob);
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'image/jpeg',
                                    data: base64Data
                                }
                            });
                        });
                    }
                }, 'image/jpeg', 0.5);
            }
        }, 1000); // 1 FPS is usually enough for context, prevents rate limits
      }

    } catch (e: any) {
      console.error(e);
      setIsError(e.message || "Failed to connect");
      cleanup();
    }
  }, [cleanup, voiceName, systemInstruction]);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current) {
        sessionRef.current.then(session => {
            session.send({
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            });
        });
    }
  }, []);

  return {
    connect,
    disconnect: cleanup,
    sendText,
    isConnected,
    isError,
    outputAnalyser: outputAnalyserRef.current,
    inputAnalyser: inputAnalyserRef.current,
    volume
  };
}
