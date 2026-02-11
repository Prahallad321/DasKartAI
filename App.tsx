
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { useLiveApi } from './hooks/use-live-api';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ControlTray } from './components/ControlTray';
import { VideoGallery } from './components/VideoGallery';
import { Chat } from './components/Chat';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { ProfileModal } from './components/ProfileModal';
import { Logo } from './components/Logo';
import { useAuth } from './contexts/AuthContext';
import { Loader2, X, Sparkles } from 'lucide-react';
import { VoiceId, ChatMessage, GroundingMetadata } from './types';
import { saveVideo } from './utils/video-storage';
import { saveChat } from './utils/chat-storage';
import { AdminPanel } from './components/admin/AdminPanel';

// --- MAIN CLIENT APP COMPONENT ---
// Encapsulating the original App logic here
const ClientApp: React.FC = () => {
  const { user, isLoading: isAuthLoading, isTrialExpired } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Puck');
  const [systemInstruction, setSystemInstruction] = useState("You are DasKartAI, an intelligent, helpful, and friendly AI shopping and general assistant. You speak naturally and help users find what they need.");
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Refs for auto-saving
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  
  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Logic ---

  const handleTranscript = useCallback((text: string, role: 'user' | 'model', isFinal: boolean) => {
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && !lastMsg.isFinal && !isFinal) {
        const updatedMsg = { ...lastMsg, text: lastMsg.text + text };
        return [...prev.slice(0, -1), updatedMsg];
      }
      if (text === '' && isFinal) {
         if (lastMsg && lastMsg.role === role) {
             const finalizedMsg = { ...lastMsg, isFinal: true };
             return [...prev.slice(0, -1), finalizedMsg];
         }
         return prev;
      }
      if (text) {
        return [...prev, {
            id: crypto.randomUUID(),
            role,
            text,
            timestamp: Date.now(),
            isFinal: false
        }];
      }
      return prev;
    });
  }, []);

  const { 
    connect, 
    disconnect, 
    sendText,
    isConnected, 
    isError, 
    outputAnalyser, 
    inputAnalyser 
  } = useLiveApi({
    voiceName: selectedVoice,
    systemInstruction,
    onConnectionChange: (connected) => {
      if (!connected) {
        setIsCamOn(false); 
        if (isRecordingRef.current) stopRecording();
        if (messagesRef.current.length > 0) saveChat(messagesRef.current).catch(console.error);
      }
    },
    onTranscript: handleTranscript
  });

  const handleSendMessage = async (text: string) => {
    if (!user) { setShowAuth(true); return; }
    if (isTrialExpired) { setShowPricing(true); return; }
    // Ensure banned users can't chat
    if (user.status !== 'active') { alert("Account suspended."); return; }

    const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        timestamp: Date.now(),
        isFinal: true
    };
    setMessages(prev => [...prev, userMsg]);
    
    if (isConnected) {
        sendText(text);
    } else {
        // Text Chat Mode
        try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             
             // Detect Image Generation Intent
             const isImageRequest = /^(draw|generate image|create image|create a picture|paint|make an image|sketch)/i.test(text);

             if (isImageRequest) {
               // IMAGE GENERATION MODE
               const modelMsgId = crypto.randomUUID();
               setMessages(prev => [...prev, {
                 id: modelMsgId,
                 role: 'model',
                 text: 'Generating image...',
                 timestamp: Date.now(),
                 isFinal: false
               }]);

               const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: {
                   parts: [{ text: text }],
                 },
                 config: {
                   imageConfig: { aspectRatio: "1:1" }
                 },
               });

               let imageBase64: string | undefined;
               let responseText = '';

               // Iterate through parts to find image and text
               if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                 for (const part of response.candidates[0].content.parts) {
                   if (part.inlineData) {
                     imageBase64 = part.inlineData.data;
                   } else if (part.text) {
                     responseText += part.text;
                   }
                 }
               }
               
               // Update message with image
               setMessages(prev => prev.map(m => m.id === modelMsgId ? { 
                 ...m, 
                 text: responseText || (imageBase64 ? "Here is the image you requested:" : "Sorry, I couldn't generate that image."),
                 image: imageBase64,
                 isFinal: true 
               } : m));

               saveChat([...messages, userMsg, { 
                 id: modelMsgId, 
                 role: 'model', 
                 text: responseText || "Generated Image", 
                 image: imageBase64,
                 timestamp: Date.now(), 
                 isFinal: true 
               }]);

             } else {
               // STANDARD TEXT CHAT MODE with SEARCH
               const history = messages.map(m => ({
                   role: m.role,
                   parts: [{ text: m.text }] 
               }));
   
               const chat = ai.chats.create({
                   model: 'gemini-3-flash-preview',
                   config: { 
                     systemInstruction,
                     tools: [{ googleSearch: {} }] // Enable Google Search
                   },
                   history: history
               });
   
               const modelMsgId = crypto.randomUUID();
               setMessages(prev => [...prev, {
                   id: modelMsgId,
                   role: 'model',
                   text: '',
                   timestamp: Date.now(),
                   isFinal: false
               }]);
   
               const resultStream = await chat.sendMessageStream({ message: text });
               let fullText = '';
               let groundingMetadata: GroundingMetadata | undefined;

               for await (const chunk of resultStream) {
                   const chunkText = chunk.text || '';
                   fullText += chunkText;
                   
                   // Capture grounding metadata if available in chunk
                   if (chunk.candidates?.[0]?.groundingMetadata) {
                      groundingMetadata = chunk.candidates[0].groundingMetadata as GroundingMetadata;
                   }

                   setMessages(prev => prev.map(m => m.id === modelMsgId ? { 
                     ...m, 
                     text: fullText,
                     groundingMetadata 
                   } : m));
               }
               setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, isFinal: true } : m));
               saveChat([...messages, userMsg, { id: modelMsgId, role: 'model', text: fullText, groundingMetadata, timestamp: Date.now(), isFinal: true }]);
             }

        } catch (e) {
            console.error("Chatbot Error:", e);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'model',
                text: "I'm having trouble processing that request right now.",
                timestamp: Date.now(),
                isFinal: true
            }]);
        }
    }
  };

  const handleConnect = async () => {
    if (!user) { setShowAuth(true); return; }
    if (isTrialExpired) { setShowPricing(true); return; }
    
    // Switch to visualizer mode essentially by connecting
    if (isCamOn) await startCamera();
    await connect(videoRef.current || undefined);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("Camera failed", e);
      setIsCamOn(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCam = async () => {
    if (isCamOn) {
      if (isRecording) stopRecording();
      stopCamera();
      setIsCamOn(false);
    } else {
      setIsCamOn(true);
      await startCamera();
    }
  };

  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      try { await saveVideo(blob); } catch (e) { console.error("Failed to save video", e); }
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecord = () => {
    isRecording ? stopRecording() : startRecording();
  };
  
  useEffect(() => {
    return () => { stopCamera(); if (isRecordingRef.current) stopRecording(); };
  }, []);

  if (isAuthLoading) {
    return <div className="w-full h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin text-daskart-blue" size={32} /></div>;
  }

  return (
    <div className="relative w-full h-screen bg-[#212121] text-white overflow-hidden">
      
      {/* 1. Modals (Always available) */}
      {showGallery && <VideoGallery onClose={() => setShowGallery(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* 2. Main Chat Interface */}
      <Chat 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        onClearChat={() => setMessages([])}
        onConnect={handleConnect}
        user={user}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenPricing={() => setShowPricing(true)}
        onOpenGallery={() => setShowGallery(true)}
      />

      {/* 3. Voice Mode Overlay */}
      <div 
        className={`fixed inset-0 z-50 bg-black flex flex-col transition-all duration-500 ease-in-out ${
            isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
            <button onClick={disconnect} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                <X size={24} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full backdrop-blur-md">
                 <Logo className="h-6 w-6" />
                 <span className="text-sm font-semibold text-daskart-blue tracking-wide">LIVE</span>
            </div>
            <div className="w-10"></div> 
        </div>

        <main className="flex-1 flex flex-col items-center justify-center relative">
             <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                <div className={`absolute top-0 right-0 w-32 h-32 m-4 rounded-xl border border-white/10 overflow-hidden z-20 transition-opacity duration-500 ${isCamOn ? 'opacity-100' : 'opacity-0'}`}>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {isRecording && <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />REC</div>}
                </div>

                <div className="w-3/4 h-3/4"><AudioVisualizer analyser={outputAnalyser} barColor="#00C2FF" /></div>
                <div className={`absolute w-1/3 h-1/3 transition-opacity ${isMicOn ? 'opacity-100' : 'opacity-0'}`}><AudioVisualizer analyser={inputAnalyser} barColor="#F7941D" /></div>
                <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-pulse-slow" />
             </div>
        </main>

        <div className="pb-12">
            <ControlTray 
                isConnected={isConnected} 
                isMicOn={isMicOn} 
                isCamOn={isCamOn} 
                isRecording={isRecording} 
                onToggleMic={() => setIsMicOn(!isMicOn)} 
                onToggleCam={toggleCam} 
                onToggleRecord={toggleRecord} 
                onConnect={handleConnect} 
                onDisconnect={disconnect} 
            />
        </div>
      </div>
    </div>
  );
};

// --- ROUTER ROOT ---
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminPanel />} />
        <Route path="/" element={<ClientApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
