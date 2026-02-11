
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ControlTray } from './components/ControlTray';
import { VideoGallery } from './components/VideoGallery';
import { Chat } from './components/Chat';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { TranscriptPanel } from './components/TranscriptPanel';
import { LiveCaptions } from './components/LiveCaptions';
import { Logo } from './components/Logo';
import { useAuth } from './contexts/AuthContext';
import { Loader2, X, AlertTriangle, FileText } from 'lucide-react';
import { VoiceId, ChatMessage, Attachment } from './types';
import { saveVideo } from './utils/video-storage';
import { saveChat, StoredChat } from './utils/chat-storage';
import { AdminPanel } from './components/admin/AdminPanel';
import { api } from './services/api';

// --- MAIN CLIENT APP COMPONENT ---
const ClientApp: React.FC = () => {
  const { user, isLoading: isAuthLoading, isTrialExpired } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Puck');
  const [systemInstruction, setSystemInstruction] = useState("You are DasKartAI, a warm, engaging, and human-like AI assistant.");
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());

  // Refs
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  
  const currentChatIdRef = useRef(currentChatId);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Live API Hook ---
  const handleTranscript = useCallback((text: string, role: 'user' | 'model', isFinal: boolean) => {
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && !lastMsg.isFinal && !isFinal) {
        return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + text }];
      }
      if (text === '' && isFinal) {
         if (lastMsg && lastMsg.role === role) return [...prev.slice(0, -1), { ...lastMsg, isFinal: true }];
         return prev;
      }
      if (text) {
        return [...prev, { id: crypto.randomUUID(), role, text, timestamp: Date.now(), isFinal: false }];
      }
      return prev;
    });
  }, []);

  const { connect, disconnect, sendText: sendLiveText, isConnected, isError, outputAnalyser, inputAnalyser, volume } = useLiveApi({
    voiceName: selectedVoice,
    systemInstruction,
    onConnectionChange: (connected) => {
      if (!connected) {
        if (isRecordingRef.current) stopRecording();
        setIsCamOn(false); stopCamera(); setShowTranscript(false);
        if (messagesRef.current.length > 0) saveChat(currentChatIdRef.current, messagesRef.current).catch(console.error);
      }
    },
    onTranscript: handleTranscript
  });

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (text: string, attachments?: Attachment[]) => {
    if (!user) { setShowAuth(true); return; }
    if (isTrialExpired) { setShowPricing(true); return; }
    if (user.status !== 'active') { alert("Account suspended."); return; }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, attachments, timestamp: Date.now(), isFinal: true };
    setMessages(prev => [...prev, userMsg]);
    
    if (isConnected) {
        sendLiveText(text);
    } else {
        // --- NEW: Use API Service instead of direct Gemini call ---
        try {
             const modelMsgId = crypto.randomUUID();
             setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now(), isFinal: false }]);

             // Convert messages to history format for API
             const history = messages.map(m => ({
                 role: m.role,
                 parts: [{ text: m.text }]
             }));

             // Call API with selected model
             const response = await api.sendMessage(text, attachments, history, systemInstruction, selectedModel);
             
             const finalModelMsg = { 
                 id: modelMsgId, 
                 role: 'model' as const, 
                 text: response.text, 
                 groundingMetadata: response.groundingMetadata,
                 image: response.image,
                 timestamp: Date.now(), 
                 isFinal: true 
             };
             
             setMessages(prev => prev.map(m => m.id === modelMsgId ? finalModelMsg : m));
             saveChat(currentChatId, [...messages, userMsg, finalModelMsg]);

        } catch (e: any) {
            console.error("Chat Error:", e);
            const errorMsg = { id: crypto.randomUUID(), role: 'model' as const, text: e.message || "Connection failed.", timestamp: Date.now(), isFinal: true };
            setMessages(prev => [...prev, errorMsg]);
        }
    }
  };

  const handleConnect = async () => {
    if (!user) { setShowAuth(true); return; }
    if (isTrialExpired) { setShowPricing(true); return; }
    if (isCamOn) await startCamera();
    await connect(videoRef.current || undefined);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e) { setIsCamOn(false); }
  };

  const toggleCam = async () => {
    if (isCamOn) { if (isRecording) stopRecording(); stopCamera(); setIsCamOn(false); } 
    else { setIsCamOn(true); await startCamera(); }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    const mediaRecorder = new MediaRecorder(videoRef.current.srcObject as MediaStream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    mediaRecorder.onstop = async () => {
      try { await saveVideo(new Blob(chunksRef.current, { type: 'video/webm' })); } catch (e) { console.error(e); }
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const toggleRecord = () => { isRecording ? stopRecording() : startRecording(); };
  const handleLoadChat = (chat: StoredChat) => { setMessages(chat.messages); setCurrentChatId(chat.id); };
  const handleClearChat = () => { setMessages([]); setCurrentChatId(crypto.randomUUID()); };
  
  useEffect(() => { return () => { stopCamera(); if (isRecordingRef.current) stopRecording(); }; }, []);

  if (isAuthLoading) return <div className="w-full h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isAiSpeaking = lastMessage?.role === 'model' && !lastMessage.isFinal;
  const isUserSpeaking = volume > 15; 

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-50 overflow-hidden selection:bg-blue-500/30">
      {showGallery && <VideoGallery onClose={() => setShowGallery(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} systemInstruction={systemInstruction} onSystemInstructionChange={setSystemInstruction} />}

      <Chat 
        messages={messages} onSendMessage={handleSendMessage} onClearChat={handleClearChat} onConnect={handleConnect}
        user={user} onOpenSettings={() => setShowSettings(true)} onOpenProfile={() => setShowProfile(true)}
        onOpenPricing={() => setShowPricing(true)} onOpenGallery={() => setShowGallery(true)} onLoadChat={handleLoadChat} onLogin={() => setShowAuth(true)}
        selectedModel={selectedModel} onModelChange={setSelectedModel}
      />

      <div className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col transition-all duration-500 ease-in-out ${isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
            <button onClick={disconnect} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-gray-300 transition-colors"><X size={24} /></button>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full shadow-lg border border-white/10"><Logo className="h-6 w-6" disableText={false} /><span className="text-sm font-semibold text-blue-400 tracking-wide ml-2">LIVE</span></div>
            <button onClick={() => setShowTranscript(!showTranscript)} className={`p-2 rounded-full transition-colors flex items-center gap-2 px-4 border border-transparent ${showTranscript ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/10 text-gray-300 hover:bg-white/20 border-white/5'}`}><FileText size={20} /><span className="hidden md:inline text-sm font-medium">Transcript</span></button>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center relative">
             <div className={`relative w-full max-w-2xl aspect-square flex items-center justify-center transition-all duration-300 ${showTranscript ? 'md:-translate-x-32' : ''}`}>
                <div className={`absolute top-0 right-0 w-32 h-32 m-4 rounded-xl border border-white/20 shadow-2xl overflow-hidden z-20 transition-opacity duration-500 bg-black ${isCamOn ? 'opacity-100' : 'opacity-0'}`}>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    {isRecording && <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />REC</div>}
                </div>
                <div className="w-3/4 h-3/4"><AudioVisualizer analyser={outputAnalyser} barColor="#3B82F6" /></div>
                <div className={`absolute w-1/3 h-1/3 transition-opacity ${isMicOn ? 'opacity-100' : 'opacity-0'}`}><AudioVisualizer analyser={inputAnalyser} barColor="#F97316" /></div>
                <div className={`absolute w-4 h-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 ${isAiSpeaking ? 'bg-blue-400 animate-pulse scale-125' : 'bg-white'}`} />
             </div>
             <LiveCaptions lastMessage={lastMessage} isUserSpeaking={isUserSpeaking} isAiSpeaking={isAiSpeaking} />
             {isError && <div className="absolute bottom-32 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {isError}</div>}
             <TranscriptPanel isOpen={showTranscript} onClose={() => setShowTranscript(false)} messages={messages} />
        </main>
        <div className="pb-12"><ControlTray isConnected={isConnected} isMicOn={isMicOn} isCamOn={isCamOn} isRecording={isRecording} onToggleMic={() => setIsMicOn(!isMicOn)} onToggleCam={toggleCam} onToggleRecord={toggleRecord} onConnect={handleConnect} onDisconnect={disconnect} /></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  if (path.startsWith('/admin')) return <AdminPanel />;
  return <ClientApp />;
};
export default App;
