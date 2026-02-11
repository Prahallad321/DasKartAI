
import React, { useRef, useState, useEffect } from 'react';
import { X, Video, Square, Check, RefreshCw, Loader2, Mic } from 'lucide-react';

interface VideoRecorderProps {
  onClose: () => void;
  onSave: (videoFile: File, transcript: string) => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ onClose, onSave }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isPreviewing, setIsPreviewing] = useState(true); // Camera active
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
          audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setError("Camera/Microphone access denied. Please check permissions.");
      }
    };

    if (isPreviewing && !recordedBlob) {
        startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isPreviewing, recordedBlob]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const win = window as any;
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let final = '';
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (final) setTranscript(prev => prev + ' ' + final);
                setInterimTranscript(interim);
            };
            
            recognitionRef.current = recognition;
        }
    }
  }, []);

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    
    setTranscript('');
    setInterimTranscript('');
    chunksRef.current = [];
    
    const stream = videoRef.current.srcObject as MediaStream;
    // Prefer mp4/webm
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') 
        ? 'video/webm;codecs=vp8' 
        : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setIsPreviewing(false);
      setIsRecording(false);
      clearInterval(timerIntervalRef.current!);
      setTimer(0);
      recognitionRef.current?.stop();
    };

    recorder.start();
    setIsRecording(true);
    
    // Start Timer
    setTimer(0);
    timerIntervalRef.current = window.setInterval(() => {
        setTimer(t => t + 1);
    }, 1000);

    // Start Recognition
    try {
        recognitionRef.current?.start();
    } catch (e) {
        console.warn("Speech recognition failed to start", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    setRecordedBlob(null);
    setIsPreviewing(true);
    setTranscript('');
    setInterimTranscript('');
  };

  const confirmSave = () => {
    if (recordedBlob) {
        // Create file from blob
        const file = new File([recordedBlob], `video_${Date.now()}.webm`, { type: recordedBlob.type });
        onSave(file, (transcript + ' ' + interimTranscript).trim());
        onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
         <div className="flex items-center gap-2 text-white">
            <Video className="text-red-500" size={20} />
            <span className="font-semibold">Video Mode</span>
         </div>
         <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} />
         </button>
      </div>

      {/* Main View */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
             <div className="text-red-400 text-center p-4">
                 <p>{error}</p>
                 <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white">Close</button>
             </div>
        ) : !recordedBlob ? (
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
            />
        ) : (
            <video 
                src={URL.createObjectURL(recordedBlob)} 
                controls 
                className="w-full h-full object-contain" 
            />
        )}

        {/* Live Transcript Overlay */}
        {(transcript || interimTranscript) && isRecording && (
            <div className="absolute bottom-32 left-4 right-4 text-center">
                <span className="inline-block bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-lg font-medium shadow-lg">
                    {transcript} <span className="text-white/60">{interimTranscript}</span>
                </span>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 pb-10 flex flex-col items-center gap-6">
         
         {/* Timer */}
         {isRecording && (
             <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-mono animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {formatTime(timer)}
             </div>
         )}

         <div className="flex items-center gap-8">
             {!recordedBlob ? (
                 <>
                    {isRecording ? (
                        <button 
                            onClick={stopRecording}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                        >
                            <Square size={32} fill="white" className="text-white" />
                        </button>
                    ) : (
                        <button 
                            onClick={startRecording}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-500 group-hover:scale-90 transition-transform" />
                        </button>
                    )}
                 </>
             ) : (
                 <>
                    <button 
                        onClick={retake}
                        className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <div className="p-4 rounded-full bg-white/10 group-hover:bg-white/20">
                            <RefreshCw size={24} />
                        </div>
                        <span className="text-xs font-medium">Retake</span>
                    </button>

                    <button 
                        onClick={confirmSave}
                        className="flex flex-col items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group"
                    >
                        <div className="p-4 rounded-full bg-blue-600 group-hover:bg-blue-500 shadow-lg shadow-blue-600/30">
                            <Check size={28} className="text-white" />
                        </div>
                        <span className="text-xs font-medium">Use Video</span>
                    </button>
                 </>
             )}
         </div>
         
         {!recordedBlob && !isRecording && (
             <p className="text-slate-500 text-sm">Tap to start recording • Audio is captured</p>
         )}
      </div>
    </div>
  );
};
