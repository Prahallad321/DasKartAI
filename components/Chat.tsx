
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, X, MessageSquare, User, Sparkles, History, Menu, Trash2, Download, Copy, Edit, 
  MoreHorizontal, Headphones, Settings, Image as ImageIcon, PanelLeftClose, PanelLeft, 
  Search, Plus, Globe, ExternalLink, ChevronDown, Mic, AudioLines, FolderPlus, MonitorPlay,
  ChevronUp, LogIn, Loader2, Volume2, MicOff, FileText, Camera, LayoutGrid, Zap, Play, Square, Video, Check
} from 'lucide-react';
import { ChatMessage, User as UserType, Attachment } from '../types';
import { getChats, deleteChat, clearAllChats, StoredChat } from '../utils/chat-storage';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { VideoRecorder } from './VideoRecorder';
import { api } from '../services/api'; // Import API service

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  onClearChat: () => void;
  onConnect: () => void;
  user: UserType | null;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenPricing: () => void;
  onOpenGallery: () => void;
  onLoadChat: (chat: StoredChat) => void;
  onLogin: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

// Full Model List Definition
const ALL_MODELS = [
  { category: 'Gemini (Google)', items: [
      { id: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash Live', desc: 'Optimized for Real-time Audio/Video' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Text-out model' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Text-out model' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2 Flash', desc: 'Text-out model' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2 Flash Exp', desc: 'Experimental model' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2 Flash Lite', desc: 'Lightweight model' },
      { id: 'gemini-2.5-flash-tts', label: 'Gemini 2.5 Flash TTS', desc: 'Multi-modal generative' },
      { id: 'gemini-2.5-pro-tts', label: 'Gemini 2.5 Pro TTS', desc: 'Multi-modal generative' },
      { id: 'gemma-3-1b', label: 'Gemma 3 1B', desc: 'Open model' },
      { id: 'gemma-3-4b', label: 'Gemma 3 4B', desc: 'Open model' }
  ]},
  { category: 'OpenAI (Frontier)', items: [
      { id: 'gpt-5.2', label: 'GPT-5.2', desc: 'Best for coding & agentic tasks' },
      { id: 'gpt-5-mini', label: 'GPT-5 mini', desc: 'Faster, cost-efficient version' },
      { id: 'gpt-5-nano', label: 'GPT-5 nano', desc: 'Fastest, most cost-efficient' },
      { id: 'gpt-5.2-pro', label: 'GPT-5.2 pro', desc: 'Smarter, precise responses' },
      { id: 'gpt-5', label: 'GPT-5', desc: 'Intelligent reasoning model' },
      { id: 'gpt-4.1', label: 'GPT-4.1', desc: 'Smartest non-reasoning model' },
      { id: 'gpt-4o', label: 'GPT-4o', desc: 'Omni model' }
  ]},
  { category: 'Visual & Video (Google)', items: [
      { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', desc: 'Nano Banana Pro - High Fidelity' },
      { id: 'veo-3.1-generate-preview', label: 'Veo 3 Generate', desc: 'High Quality Video Generation' },
      { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3 Fast Generate', desc: 'Low Latency Video Generation' }
  ]}
];

// Helper: Text Highlighter
const Highlighter: React.FC<{ text: string, highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  return <>{parts.map((part, i) => regex.test(part) ? <span key={i} className="bg-yellow-500/50 text-white font-medium rounded-[2px] px-0.5">{part}</span> : part)}</>;
};

// Helper: Formatted Text
const FormattedText: React.FC<{ text: string, highlight?: string }> = ({ text, highlight = '' }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-[15px] leading-7 break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).replace(/^.*\n/, '');
          return (
            <div key={index} className="relative group my-4 rounded-md overflow-hidden border border-slate-700 shadow-sm">
               <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between items-center border-b border-slate-700">
                  <span>Code</span>
                  <button onClick={() => navigator.clipboard.writeText(content.trim())} className="flex items-center gap-1 hover:text-white"><Copy size={12} /> Copy</button>
               </div>
               <pre className="bg-slate-900 p-4 overflow-x-auto text-slate-200"><code className="font-mono text-sm">{content.trim()}</code></pre>
            </div>
          );
        }
        return <span key={index} className="whitespace-pre-wrap"><Highlighter text={part} highlight={highlight} /></span>;
      })}
    </div>
  );
};

// Helper: Grounding Sources
const GroundingSources: React.FC<{ metadata: any }> = ({ metadata }) => {
  if (!metadata || !metadata.groundingChunks || !Array.isArray(metadata.groundingChunks)) return null;
  const sources = metadata.groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web && web.uri && web.title);
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider"><Globe size={12} /> Sources</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source: any, idx: number) => (
          <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-md transition-colors group">
            <div className="mt-0.5 p-1.5 bg-blue-500/10 text-blue-400 rounded-md"><ExternalLink size={12} /></div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-medium text-slate-200 truncate group-hover:underline">{source.title}</div>
               <div className="text-xs text-slate-500 truncate mt-0.5">{new URL(source.uri).hostname}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// Helper: Attachments
const AttachmentDisplay: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {attachments.map((att, idx) => (
        <div key={idx} className="relative group overflow-hidden rounded-lg border border-slate-700">
          {att.mimeType.startsWith('image/') ? (
            <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="h-32 w-auto object-cover"/>
          ) : att.mimeType.startsWith('video/') ? (
             <video src={`data:${att.mimeType};base64,${att.data}`} className="h-32 w-auto object-cover" controls/>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-slate-800 h-full min-w-[120px]">
              <FileText size={20} className="text-slate-400" />
              <span className="text-xs text-slate-300 truncate max-w-[100px]">{att.name || 'Document'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Helper: Message Bubble
const MessageBubble: React.FC<{ msg: ChatMessage, highlight?: string, domRef?: React.Ref<HTMLDivElement>, onSpeak: (text: string) => void }> = ({ msg, highlight, domRef, onSpeak }) => {
  const isUser = msg.role === 'user';
  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg.image) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${msg.image}`;
      link.download = `DasKartAI-Image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
      <div ref={domRef} className={`w-full ${!isUser ? 'bg-slate-900/50 border-y border-slate-800' : 'bg-transparent'}`}>
        <div className="text-base gap-4 md:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] p-4 md:py-6 flex lg:px-0 m-auto text-slate-100">
            <div className="flex-shrink-0 flex flex-col relative items-end">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center border border-white/5 ${isUser ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    {isUser ? <User size={18} className="text-white" /> : <Logo className="w-5 h-5" disableText />}
                </div>
            </div>
            <div className="relative flex-1 overflow-hidden space-y-2 group/msg">
                <div className="font-semibold text-sm opacity-60 mb-1 text-slate-300 flex items-center gap-2">
                  {isUser ? 'You' : 'DasKartAI'}
                  {!isUser && msg.text && (
                    <button onClick={() => onSpeak(msg.text)} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Read Aloud">
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
                {msg.attachments && <AttachmentDisplay attachments={msg.attachments} />}
                {msg.text && <FormattedText text={msg.text} highlight={highlight} />}
                {msg.image && (
                  <div className="relative mt-2 max-w-sm rounded-lg overflow-hidden border border-slate-700 group/image shadow-lg">
                    <img src={`data:image/png;base64,${msg.image}`} alt="Generated by AI" className="w-full h-auto object-cover"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                       <button onClick={handleDownloadImage} className="p-2 bg-slate-900 rounded-full hover:bg-black text-white transition-colors" title="Download Image"><Download size={20} /></button>
                    </div>
                  </div>
                )}
                {/* Generated Video Display */}
                {msg.video && (
                  <div className="relative mt-2 max-w-sm rounded-lg overflow-hidden border border-slate-700 group/video shadow-lg">
                    <video controls src={`data:video/mp4;base64,${msg.video}`} className="w-full h-auto" />
                  </div>
                )}
                {msg.groundingMetadata && <GroundingSources metadata={msg.groundingMetadata} />}
            </div>
        </div>
      </div>
  );
};

export const Chat: React.FC<ChatProps> = ({ 
    messages, onSendMessage, onClearChat, onConnect, user,
    onOpenSettings, onOpenProfile, onOpenPricing, onOpenGallery, onLoadChat, onLogin,
    selectedModel, onModelChange
}) => {
  const [history, setHistory] = useState<StoredChat[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_sidebar_width');
      return saved ? parseInt(saved) : 280;
    }
    return 280;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Audio Conversion Tool State
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const recognitionRef = useRef<any>(null);
  const voiceStateRef = useRef(voiceState);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const transcriptionRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptionChunksRef = useRef<Blob[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Sync ref with state for event listeners
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  // Stable ref for sendMessage to prevent effect re-runs
  const onSendMessageRef = useRef(onSendMessage);
  useEffect(() => { onSendMessageRef.current = onSendMessage; }, [onSendMessage]);

  useEffect(() => {
    if (window.innerWidth >= 768) setShowSidebar(true);
  }, []);

  // Close model selector on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sidebar Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      // Constraints: Min 240px, Max 600px or 50% of viewport
      const newWidth = Math.max(240, Math.min(e.clientX, 600, window.innerWidth * 0.5));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('nova_sidebar_width', sidebarWidth.toString());
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(chat => chat.title.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [history, sidebarSearch]);

  useEffect(() => { loadHistory(); }, [messages]); 
  
  useEffect(() => { 
    if (!isSearchOpen && !searchQuery) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isSearchOpen, searchQuery]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowAttachMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Audio Logic: Internal Conversion (Voice -> Text) - Uses Web Speech API (Fast streaming)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
             // Avoid overriding processing state
             if (voiceStateRef.current === 'idle') setVoiceState('listening');
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            onSendMessageRef.current(text); // Use ref to call prop
            setVoiceState('processing');
            voiceStateRef.current = 'processing'; // Prevent race condition in onend
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech error", event.error);
          setVoiceState('idle');
        };

        recognition.onend = () => {
           // Only reset if we were strictly listening (not processing)
           if (voiceStateRef.current === 'listening') {
               setVoiceState('idle');
           }
        };

        recognitionRef.current = recognition;
      }
    }
    
    // Cleanup to prevent duplicate instances
    return () => {
        if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []); // Empty dependency array ensures stable instance

  // Updated speak function to use API for TTS
  const speak = async (text: string) => {
    if (!text) return;
    setVoiceState('speaking');
    try {
       const audioBase64 = await api.generateSpeech(text);
       if (!audioBase64) throw new Error("No audio generated");

       const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
       const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
       const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer);
       const source = audioContext.createBufferSource();
       source.buffer = audioBuffer;
       source.connect(audioContext.destination);
       source.onended = () => setVoiceState('idle');
       source.start();
    } catch (e) {
       console.error("TTS Error", e);
       // Fallback
       window.speechSynthesis.cancel();
       const utterance = new SpeechSynthesisUtterance(text);
       utterance.onend = () => setVoiceState('idle');
       window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-play AI response only if user initiated via voice (state is processing)
  useEffect(() => {
    if (voiceState === 'processing') {
       const lastMsg = messages[messages.length - 1];
       if (lastMsg && lastMsg.role === 'model' && lastMsg.isFinal) {
           speak(lastMsg.text);
       }
    }
  }, [messages, voiceState]); 

  const toggleVoiceMode = () => {
    if (voiceState === 'idle') {
        recognitionRef.current?.start();
    } else if (voiceState === 'listening') {
        recognitionRef.current?.stop();
        setVoiceState('idle');
    } else if (voiceState === 'speaking') {
        window.speechSynthesis.cancel();
        setVoiceState('idle');
    } else if (voiceState === 'processing') {
        // Allow cancelling the wait
        setVoiceState('idle');
    }
  };

  // Transcription using Gemini
  const toggleTranscription = async () => {
     if (isTranscribing) {
         // Stop
         transcriptionRecorderRef.current?.stop();
         setIsTranscribing(false);
     } else {
         // Start
         try {
             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             const recorder = new MediaRecorder(stream);
             transcriptionChunksRef.current = [];
             
             recorder.ondataavailable = (e) => transcriptionChunksRef.current.push(e.data);
             recorder.onstop = async () => {
                 const blob = new Blob(transcriptionChunksRef.current, { type: 'audio/wav' });
                 
                 // Convert to base64
                 const reader = new FileReader();
                 reader.onloadend = async () => {
                     const base64Audio = (reader.result as string).split(',')[1];
                     try {
                         setInputValue("Transcribing audio...");
                         const text = await api.transcribeAudio(base64Audio);
                         setInputValue(text);
                     } catch (e) {
                         console.error("Transcription Error", e);
                         setInputValue("Error transcribing audio.");
                     }
                 };
                 reader.readAsDataURL(blob);
                 
                 // Stop tracks
                 stream.getTracks().forEach(t => t.stop());
             };
             
             transcriptionRecorderRef.current = recorder;
             recorder.start();
             setIsTranscribing(true);
             setShowAttachMenu(false); // Close menu
         } catch (e) {
             console.error("Mic access denied", e);
         }
     }
  };

  const loadHistory = async () => { setHistory(await getChats()); };
  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) { await deleteChat(id); loadHistory(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() || attachments.length > 0) {
          onSendMessage(inputValue.trim(), attachments);
          setInputValue('');
          setAttachments([]);
          if (inputRef.current) inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newAttachments: Attachment[] = [];
      for (const file of files) {
        const reader = new FileReader();
        try {
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
          newAttachments.push({ mimeType: file.type, data: dataUrl.split(',')[1], name: file.name });
        } catch (err) { console.error("Error reading file", err); }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      setShowAttachMenu(false);
      e.target.value = '';
    }
  };

  const handleVideoSave = async (file: File, transcript: string) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          const videoAttachment: Attachment = {
              mimeType: file.type,
              data: base64String.split(',')[1],
              name: file.name
          };
          setAttachments(prev => [...prev, videoAttachment]);
          if (transcript) setInputValue(transcript);
      };
      reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const handleNavClick = (action: () => void) => { action(); if (window.innerWidth < 768) setShowSidebar(false); };
  const isEmptyState = messages.length === 0;

  // Visual state classes for the mic button
  const micButtonClasses = `p-3 rounded-full transition-all relative flex-shrink-0 ${
    voiceState === 'listening' ? 'bg-red-500/20 text-red-500 animate-pulse' : 
    voiceState === 'processing' ? 'bg-blue-500/20 text-blue-500' : 
    voiceState === 'speaking' ? 'bg-green-500/20 text-green-500' : 
    'text-slate-400 hover:bg-slate-800'
  }`;

  // Helper to format model name for display
  const getModelDisplayName = (id: string) => {
      if (id.includes('gpt')) {
          return id.toUpperCase().replace('-', ' ');
      }
      // Special case for the Live model which has a long ID
      if (id.includes('native-audio')) return 'Gemini Live';
      
      const parts = id.split('-');
      // Capitalize first letter of each part
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ').replace('Preview', '').trim();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden">
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
      <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" multiple onChange={handleFileSelect} />
      
      {showVideoRecorder && <VideoRecorder onClose={() => setShowVideoRecorder(false)} onSave={handleVideoSave} />}

      {/* --- SIDEBAR --- */}
      <div 
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`fixed inset-y-0 left-0 z-40 w-[280px] md:w-[var(--sidebar-width)] flex-shrink-0 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 pb-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Search history..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
        </div>
        <div className="px-3 pb-2 space-y-1 mt-2">
            <div className="text-xs font-bold text-slate-500 px-3 mb-2 uppercase tracking-wider">Quick Actions</div>
             <button onClick={() => handleNavClick(onClearChat)} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left group"><MessageSquare size={18} className="text-blue-400" /><span>New chat</span></button>
             <button onClick={() => handleNavClick(onOpenGallery)} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left group"><ImageIcon size={18} className="text-purple-400" /><span>Images</span></button>
             <button className="flex items-center gap-3 px-3 py-2 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left group"><LayoutGrid size={18} className="text-green-400" /><span>Apps</span></button>
             <button onClick={() => handleNavClick(onClearChat)} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left group"><FolderPlus size={18} className="text-yellow-400" /><span>New project</span></button>
             <button onClick={onConnect} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left group"><Globe size={18} className="text-cyan-400" /><span>Online</span></button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 mt-2">
            <div className="text-xs font-bold text-slate-500 px-3 py-2">Recents</div>
            {filteredHistory.map(chat => (
                <div key={chat.id} onClick={() => handleNavClick(() => onLoadChat(chat))} className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer relative overflow-hidden">
                    <span className="truncate flex-1 pr-4">{chat.title}</span>
                    <button onClick={(e) => handleDeleteHistory(e, chat.id)} className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
            ))}
        </div>
        <div className="p-3 border-t border-slate-800 mt-auto">
             {user ? (
                <div onClick={() => handleNavClick(onOpenProfile)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold shadow-md">{user.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 overflow-hidden"><div className="text-sm font-medium text-white truncate">{user.name}</div><div className="text-xs text-slate-500 truncate">{user.email}</div></div>
                </div>
             ) : (
                <button onClick={onLogin} className="flex items-center gap-3 px-3 py-3 w-full text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-900/20 group">
                    <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center"><LogIn size={16} /></div>
                    <div className="flex-1"><div className="font-semibold">Sign up</div></div>
                </button>
             )}
        </div>

        {/* Resize Handle - Desktop Only */}
        <div
          className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 opacity-0 hover:opacity-100 active:opacity-100 active:bg-blue-600"
          onMouseDown={() => setIsResizing(true)}
        />
      </div>
      {showSidebar && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setShowSidebar(false)} />}

      {/* --- RIGHT SIDEBAR (Audio Conversion) --- */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[300px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 transform transition-transform duration-300 ${showRightSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2"><AudioLines size={18} className="text-blue-400"/> Audio Conversion</h3>
            <button onClick={() => setShowRightSidebar(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
         </div>
         <div className="p-6 flex flex-col items-center justify-center flex-1">
             {/* Visualizer / Status */}
             <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${
                 voiceState === 'listening' ? 'bg-red-500/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]' :
                 voiceState === 'processing' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                 voiceState === 'speaking' ? 'bg-green-500/20 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)]' :
                 'bg-slate-800 text-slate-500'
             }`}>
                 {voiceState === 'listening' ? <Mic size={40} /> :
                  voiceState === 'processing' ? <Loader2 size={40} className="animate-spin" /> :
                  voiceState === 'speaking' ? <Volume2 size={40} className="animate-pulse" /> :
                  <MicOff size={40} />}
             </div>
             
             <p className="text-slate-300 font-medium mb-2 uppercase tracking-widest text-xs">
                 {voiceState === 'idle' ? 'Ready to Record' :
                  voiceState === 'listening' ? 'Listening...' :
                  voiceState === 'processing' ? 'Processing...' : 'Speaking...'}
             </p>
             
             {/* Controls */}
             <button 
                onClick={toggleVoiceMode}
                className={`px-8 py-3 rounded-full font-bold transition-all shadow-lg flex items-center gap-2 mt-4 ${
                  voiceState === 'listening' 
                     ? 'bg-red-500 hover:bg-red-600 text-white' 
                     : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
             >
                {voiceState === 'listening' ? <><Square size={16} fill="white"/> Stop Recording</> : <><Mic size={18} /> Start Recording</>}
             </button>
         </div>

         {/* Transcript / Recent Audio Logs */}
         <div className="flex-1 overflow-y-auto border-t border-slate-800 p-4 bg-black/20">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Transcript</div>
             <div className="space-y-3">
                 {messages.filter(m => m.role === 'user' || m.role === 'model').slice(-10).reverse().map(msg => (
                     <div key={msg.id} className={`text-sm p-3 rounded-lg ${msg.role === 'user' ? 'bg-slate-800 text-slate-300' : 'bg-blue-900/20 text-blue-200'}`}>
                         <div className="text-[10px] opacity-50 mb-1 uppercase font-bold flex items-center gap-1">
                             {msg.role === 'user' ? <User size={10} /> : <Sparkles size={10} />}
                             {msg.role === 'user' ? 'You' : 'AI Assistant'}
                         </div>
                         {msg.text}
                     </div>
                 ))}
                 {messages.length === 0 && <div className="text-slate-600 text-xs text-center italic py-4">No audio conversation history</div>}
             </div>
         </div>
      </div>
      {showRightSidebar && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={() => setShowRightSidebar(false)} />}

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-slate-900">
        <div className="absolute top-0 w-full flex items-center justify-between p-4 z-20 bg-gradient-to-b from-slate-900 via-slate-900/90 to-transparent">
            {/* Left Side: Menu + Branding + Model Selector */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                {!showSidebar && <button onClick={() => setShowSidebar(true)} className="p-2 text-slate-400 hover:text-white"><Menu size={24} /></button>}
                
                {/* Branding & Model Selector */}
                <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-md p-1.5 pr-4 rounded-full border border-slate-800/50 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Logo className="w-5 h-5 text-white" disableText={true} />
                        </div>
                        <span className="font-bold text-sm tracking-wide hidden sm:block text-white">DasKart<span className="text-blue-400">AI</span></span>
                    </div>
                    
                    <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>
                    
                    {/* Model Dropdown */}
                    <div className="relative z-30" ref={modelSelectorRef}>
                        <button 
                            onClick={() => setShowModelSelector(!showModelSelector)}
                            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors py-1 px-2 rounded hover:bg-white/5"
                        >
                            {selectedModel.toLowerCase().includes('gpt') ? (
                                <><Zap size={14} className="text-green-400" /> {getModelDisplayName(selectedModel)}</>
                            ) : (
                                <><Sparkles size={14} className="text-blue-400" /> {getModelDisplayName(selectedModel)}</>
                            )}
                            <ChevronDown size={12} className={`opacity-50 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Dropdown Menu */}
                         {showModelSelector && (
                             <div className="absolute top-full left-0 mt-3 w-80 max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                                <div className="p-2 space-y-3">
                                    {ALL_MODELS.map(category => (
                                        <div key={category.category}>
                                            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                                                {category.category}
                                            </div>
                                            <div className="space-y-1">
                                                {category.items.map(model => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => {
                                                            onModelChange(model.id);
                                                            setShowModelSelector(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg flex flex-col gap-0.5 transition-colors ${
                                                            selectedModel === model.id 
                                                                ? 'bg-blue-600/10 text-blue-400' 
                                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {model.id.includes('gpt') ? <Zap size={14} className={selectedModel === model.id ? 'text-blue-400' : 'text-slate-500'} /> : model.id.includes('veo') ? <Video size={14} className={selectedModel === model.id ? 'text-blue-400' : 'text-slate-500'} /> : <Sparkles size={14} className={selectedModel === model.id ? 'text-blue-400' : 'text-slate-500'} />}
                                                            <span className="font-medium text-xs">{model.label}</span>
                                                            {selectedModel === model.id && <Check size={14} className="ml-auto" />}
                                                        </div>
                                                        <span className="text-[10px] opacity-60 truncate">{model.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hidden md:block p-2 text-slate-400 hover:bg-slate-800 rounded-full"><Search size={20} /></button>
                <button 
                  onClick={() => setShowRightSidebar(!showRightSidebar)} 
                  className={`p-2 rounded-full transition-colors ${showRightSidebar ? 'text-white bg-slate-800' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Audio Conversion"
                >
                    <AudioLines size={20} />
                </button>
                <button onClick={onOpenSettings} className="hidden md:block p-2 text-slate-400 hover:bg-slate-800 rounded-full"><Settings size={20} /></button>
                <button onClick={onClearChat} className="p-2 text-slate-400 hover:bg-slate-800 rounded-full"><Edit size={20} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-slate-800">
            {isEmptyState ? (
                <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className="mb-6 p-4 bg-slate-900 rounded-full border border-slate-800 shadow-xl"><Logo className="w-10 h-10" disableText /></div>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-8 text-center">What can I help with?</h2>
                    
                    {/* Quick Action Chips */}
                    <div className="w-full max-w-2xl flex flex-wrap justify-center gap-3 mb-8 px-4">
                        {[
                            { label: 'Create image', icon: <ImageIcon size={16} className="text-purple-400" /> },
                            { label: 'Summarize text', icon: <FileText size={16} className="text-blue-400" /> },
                            { label: 'Brainstorm', icon: <Sparkles size={16} className="text-yellow-400" /> },
                            { label: 'Analyze images', icon: <Search size={16} className="text-green-400" /> },
                        ].map((item, i) => (
                            <button 
                                key={i} 
                                onClick={() => onSendMessage(item.label)} 
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all shadow-sm"
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="w-full max-w-2xl px-4">
                        <div className="relative bg-slate-900 rounded-[26px] shadow-2xl border border-slate-800">
                            {showAttachMenu && (
                                <div ref={menuRef} className="absolute bottom-full left-0 mb-2 ml-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[180px] z-50">
                                    <button onClick={() => setShowVideoRecorder(true)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><Video size={18} className="text-red-400" />Record Video</button>
                                    <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><ImageIcon size={18} className="text-green-400" />Upload Image</button>
                                    <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><FileText size={18} className="text-orange-400" />Upload Document</button>
                                    <div className="h-px bg-slate-700 mx-2 my-1"></div>
                                    <button onClick={toggleTranscription} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200">
                                      {isTranscribing ? <Square size={18} className="text-red-400 animate-pulse" /> : <Mic size={18} className="text-blue-400" />}
                                      {isTranscribing ? 'Stop Recording' : 'Voice Note (Transcribe)'}
                                    </button>
                                </div>
                            )}
                            <div className="flex items-end p-2 gap-2">
                                <button onClick={() => setShowAttachMenu(!showAttachMenu)} className={`p-3 rounded-full transition-colors ${showAttachMenu ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Plus size={24} className={showAttachMenu ? 'rotate-45' : ''} /></button>
                                <textarea ref={inputRef} value={inputValue} onChange={(e) => { setInputValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }} onKeyDown={handleKeyDown} placeholder={isTranscribing ? "Recording..." : "Message DasKartAI..."} rows={1} className="flex-1 bg-transparent border-none text-white focus:ring-0 resize-none py-3.5 px-0 max-h-[200px] text-base" style={{ minHeight: '24px' }}/>
                                <div className="flex items-center gap-1">
                                    {/* Audio Conversion Tool (Right Side) */}
                                    <button onClick={toggleVoiceMode} className={micButtonClasses} title="Audio Conversion Tool">
                                        {voiceState === 'processing' ? <Loader2 size={24} className="animate-spin" /> : 
                                         voiceState === 'speaking' ? <Volume2 size={24} className="animate-pulse" /> : 
                                         voiceState === 'listening' ? <Square size={20} fill="currentColor" /> : 
                                         <Mic size={24} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Audio to Audio Conversion Toggle (Below Search Bar) */}
                        <div className="flex justify-end mt-3 px-2">
                            <button 
                                onClick={() => setShowRightSidebar(!showRightSidebar)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-lg border
                                    ${showRightSidebar 
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-blue-900/20' 
                                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-slate-900'}
                                `}
                            >
                                {voiceState !== 'idle' ? (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                ) : (
                                    <AudioLines size={14} />
                                )}
                                <span>Audio to Audio Conversion</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col pb-40 pt-20">
                    {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} highlight={searchQuery} onSpeak={speak} domRef={(el) => { messageRefs.current[msg.id] = el; return undefined; }} />)}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>

        {!isEmptyState && (
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative bg-slate-900 rounded-[26px] shadow-2xl border border-slate-800">
                         {showAttachMenu && (
                            <div ref={menuRef} className="absolute bottom-full left-0 mb-2 ml-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[180px] z-50">
                                <button onClick={() => setShowVideoRecorder(true)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><Video size={18} className="text-red-400" />Record Video</button>
                                <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><ImageIcon size={18} className="text-green-400" />Upload Image</button>
                                <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200"><FileText size={18} className="text-orange-400" />Upload Document</button>
                                <div className="h-px bg-slate-700 mx-2 my-1"></div>
                                <button onClick={toggleTranscription} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 text-left text-sm text-slate-200">
                                  {isTranscribing ? <Square size={18} className="text-red-400 animate-pulse" /> : <Mic size={18} className="text-blue-400" />}
                                  {isTranscribing ? 'Stop Recording' : 'Voice Note (Transcribe)'}
                                </button>
                            </div>
                        )}
                        {attachments.length > 0 && (
                            <div className="flex gap-2 p-3 pb-0 overflow-x-auto"><AttachmentDisplay attachments={attachments} /></div>
                        )}
                        <div className="flex items-end p-2 gap-2">
                            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className={`p-3 rounded-full transition-colors ${showAttachMenu ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Plus size={24} className={showAttachMenu ? 'rotate-45' : ''} /></button>
                            <textarea ref={inputRef} value={inputValue} onChange={(e) => { setInputValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }} onKeyDown={handleKeyDown} placeholder={isTranscribing ? "Recording..." : "Message DasKartAI..."} rows={1} className="flex-1 bg-transparent border-none text-white focus:ring-0 resize-none py-3.5 px-0 max-h-[200px] text-base" style={{ minHeight: '24px' }}/>
                            <div className="flex items-center gap-1">
                                {/* Audio Conversion Tool (Right Side) */}
                                <button onClick={toggleVoiceMode} className={micButtonClasses} title="Audio Conversion Tool">
                                    {voiceState === 'processing' ? <Loader2 size={24} className="animate-spin" /> : 
                                     voiceState === 'speaking' ? <Volume2 size={24} className="animate-pulse" /> : 
                                     voiceState === 'listening' ? <Square size={20} fill="currentColor" /> : 
                                     <Mic size={24} />}
                                    {(voiceState === 'listening' || voiceState === 'speaking') && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${voiceState === 'listening' ? 'bg-red-400' : 'bg-green-400'}`}></span><span className={`relative inline-flex rounded-full h-3 w-3 ${voiceState === 'listening' ? 'bg-red-500' : 'bg-green-500'}`}></span></span>}
                                </button>
                                
                                {inputValue.trim() || attachments.length > 0 ? (
                                    <button onClick={() => { onSendMessage(inputValue, attachments); setInputValue(''); setAttachments([]); }} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 shadow-lg"><Send size={20} /></button>
                                ) : (
                                    <button onClick={onConnect} className="p-3 text-slate-400 hover:bg-slate-800 rounded-full" title="Live Video Mode"><AudioLines size={24} /></button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
