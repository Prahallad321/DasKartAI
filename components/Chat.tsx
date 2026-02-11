
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, X, MessageSquare, User, Sparkles, History, Menu, Trash2, Download, Copy, Edit, 
  MoreHorizontal, Headphones, Settings, Image as ImageIcon, PanelLeftClose, PanelLeft, 
  Search, Plus, Globe, ExternalLink, ChevronDown, Mic, AudioLines, FolderPlus, MonitorPlay
} from 'lucide-react';
import { ChatMessage, User as UserType } from '../types';
import { getChats, deleteChat, clearAllChats, StoredChat } from '../utils/chat-storage';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onConnect: () => void;
  user: UserType | null;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenPricing: () => void;
  onOpenGallery: () => void;
}

// Helper: Code Block & Text Formatting
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-[15px] leading-7 break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).replace(/^.*\n/, '');
          return (
            <div key={index} className="relative group my-4 rounded-md overflow-hidden border border-white/10">
               <div className="bg-[#343541] px-4 py-2 text-xs text-gray-400 flex justify-between items-center border-b border-white/10">
                  <span>Code</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(content.trim())}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    <Copy size={12} /> Copy
                  </button>
               </div>
               <pre className="bg-black p-4 overflow-x-auto text-gray-200">
                 <code className="font-mono text-sm">{content.trim()}</code>
               </pre>
            </div>
          );
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </div>
  );
};

// Helper: Grounding Sources (Search Results)
const GroundingSources: React.FC<{ metadata: any }> = ({ metadata }) => {
  if (!metadata || !metadata.groundingChunks || !Array.isArray(metadata.groundingChunks)) return null;

  const sources = metadata.groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri && web.title);

  if (sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <Globe size={12} />
        Sources
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source: any, idx: number) => (
          <a 
            key={idx} 
            href={source.uri} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 bg-[#343541] hover:bg-[#40414F] border border-white/5 rounded-md transition-colors group"
          >
            <div className="mt-0.5 p-1.5 bg-blue-500/10 text-blue-400 rounded-md">
              <ExternalLink size={12} />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-medium text-gray-200 truncate group-hover:underline">
                 {source.title}
               </div>
               <div className="text-xs text-gray-500 truncate mt-0.5">
                 {new URL(source.uri).hostname}
               </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// Helper: Message Bubble
const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
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
      <div className={`w-full text-gray-100 ${!isUser ? 'bg-[#2F2F2F]' : 'bg-transparent'}`}>
        <div className="text-base gap-4 md:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] p-4 md:py-6 flex lg:px-0 m-auto">
            <div className="flex-shrink-0 flex flex-col relative items-end">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    isUser ? 'bg-[#5436DA]' : 'bg-[#19C37D]' 
                }`}>
                    {isUser ? <User size={18} className="text-white" /> : <Logo className="w-5 h-5" disableText />}
                </div>
            </div>
            <div className="relative flex-1 overflow-hidden space-y-2">
                <div className="font-semibold text-sm opacity-90 mb-1">{isUser ? 'You' : 'DasKartAI'}</div>
                {msg.text && <FormattedText text={msg.text} />}
                
                {msg.image && (
                  <div className="relative mt-2 max-w-sm rounded-lg overflow-hidden border border-white/10 group/image shadow-lg">
                    <img 
                      src={`data:image/png;base64,${msg.image}`} 
                      alt="Generated by AI" 
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                         onClick={handleDownloadImage}
                         className="p-2 bg-black/60 rounded-full hover:bg-black/80 text-white transition-colors"
                         title="Download Image"
                       >
                         <Download size={20} />
                       </button>
                    </div>
                  </div>
                )}
                {msg.groundingMetadata && <GroundingSources metadata={msg.groundingMetadata} />}
            </div>
        </div>
      </div>
  );
};

// --- MAIN CHAT COMPONENT ---
export const Chat: React.FC<ChatProps> = ({ 
    messages, 
    onSendMessage, 
    onClearChat, 
    onConnect,
    user,
    onOpenSettings,
    onOpenProfile,
    onOpenPricing,
    onOpenGallery
}) => {
  const [history, setHistory] = useState<StoredChat[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadHistory(); }, [messages]); 
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadHistory = async () => { setHistory(await getChats()); };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) { await deleteChat(id); loadHistory(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
          onSendMessage(inputValue.trim());
          setInputValue('');
          if (inputRef.current) inputRef.current.style.height = 'auto';
      }
    }
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[260px] bg-[#171717] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Actions */}
        <div className="p-3 space-y-2">
            <button 
                onClick={onClearChat}
                className="flex items-center gap-2 px-3 py-2 w-full text-sm text-white hover:bg-[#212121] rounded-lg transition-colors text-left group"
            >
                <div className="bg-white p-1 rounded-sm group-hover:bg-gray-200">
                    <Logo className="w-4 h-4" disableText />
                </div>
                <span>New chat</span>
                <span className="ml-auto opacity-70"><Edit size={16} /></span>
            </button>
            
            <button className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-300 hover:bg-[#212121] rounded-lg transition-colors text-left">
                <Search size={16} />
                <span>Search chats</span>
            </button>
        </div>

        {/* Action Links */}
        <div className="px-3 pb-2 space-y-1">
             <button onClick={onOpenGallery} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-300 hover:bg-[#212121] rounded-lg transition-colors text-left">
                <ImageIcon size={16} />
                <span>Images</span>
             </button>
             <button onClick={onClearChat} className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-300 hover:bg-[#212121] rounded-lg transition-colors text-left">
                <FolderPlus size={16} />
                <span>New project</span>
             </button>
             <button className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-300 hover:bg-[#212121] rounded-lg transition-colors text-left">
                <MonitorPlay size={16} />
                <span>Online</span>
             </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
            {history.length > 0 && <div className="text-xs font-semibold text-gray-500 px-3 py-2 mt-2">Your chats</div>}
            {history.map(chat => (
                <div key={chat.id} className="group flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#212121] rounded-lg cursor-pointer transition-colors relative overflow-hidden">
                    <span className="truncate flex-1 pr-4">{chat.title}</span>
                    <button 
                        onClick={(e) => handleDeleteHistory(e, chat.id)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#171717] to-transparent group-hover:from-[#212121]"></div>
                </div>
            ))}
        </div>

        {/* Profile Footer */}
        <div className="p-3 border-t border-white/10">
             {user ? (
                <UserMenu onOpenPricing={onOpenPricing} onOpenProfile={onOpenProfile} />
             ) : (
                <button onClick={onOpenProfile} className="flex items-center gap-3 px-3 py-3 w-full text-sm text-white hover:bg-[#212121] rounded-lg transition-colors text-left">
                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center"><User size={16} /></div>
                    <div className="flex-1">
                        <div className="font-semibold">Sign up</div>
                        <div className="text-xs text-gray-500">Free Research Preview</div>
                    </div>
                </button>
             )}
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {showSidebar && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowSidebar(false)} />}

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#212121]">
        
        {/* Top Header */}
        <div className="absolute top-0 w-full flex items-center justify-between p-4 z-20">
            {/* Left: Sidebar Toggle */}
            <div className="flex items-center gap-2">
                {!showSidebar && (
                    <button onClick={() => setShowSidebar(true)} className="p-2 text-gray-400 hover:text-white rounded-md transition-colors">
                        <PanelLeft size={20} />
                    </button>
                )}
                {/* Mobile Menu */}
                <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-md">
                    <Menu size={20} />
                </button>
                
                {/* Version Selector (Desktop) */}
                <button className="hidden md:flex items-center gap-2 text-gray-300 hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors">
                    <span className="text-lg font-semibold text-gray-200">DasKartAI 2.5</span>
                    <ChevronDown size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <button onClick={onClearChat} className="p-2 text-gray-400 hover:bg-[#2F2F2F] rounded-full transition-colors">
                    <Edit size={20} />
                </button>
                {user && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer" onClick={onOpenProfile}>
                        {user.name.charAt(0)}
                    </div>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-600">
            {isEmptyState ? (
                // EMPTY STATE (CENTERED)
                <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className="mb-8 p-4 bg-white/5 rounded-full">
                        <Logo className="w-12 h-12" disableText />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-semibold text-white mb-8 text-center">
                        What's on the agenda today?
                    </h2>
                    
                    {/* Input Area (Centered for Empty State) */}
                    <div className="w-full max-w-2xl">
                        <div className="relative bg-[#2F2F2F] rounded-[26px] shadow-lg border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-end p-3 gap-3">
                                <button className="p-2 bg-gray-700/50 hover:bg-gray-600 rounded-full text-white transition-colors mb-0.5">
                                    <Plus size={20} />
                                </button>
                                
                                <textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything"
                                    rows={1}
                                    className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 resize-none py-3 px-0 max-h-[200px] text-base"
                                    style={{ minHeight: '24px' }}
                                />

                                <div className="flex items-center gap-2 mb-0.5">
                                    {inputValue.trim() ? (
                                        <button 
                                            onClick={() => { onSendMessage(inputValue); setInputValue(''); }}
                                            className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <Send size={18} />
                                        </button>
                                    ) : (
                                        <>
                                            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                                <Mic size={20} />
                                            </button>
                                            <button 
                                                onClick={onConnect}
                                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                                            >
                                                <AudioLines size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Suggestion Chips */}
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            {['Create a workout plan', 'Summarize this article', 'Help me debug code', 'Write an email'].map((s, i) => (
                                <button key={i} onClick={() => onSendMessage(s)} className="px-4 py-2 bg-transparent border border-white/10 rounded-full text-sm text-gray-300 hover:bg-white/5 transition-colors">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                // MESSAGES LIST
                <div className="flex flex-col pb-40 pt-20">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>

        {/* Bottom Input Area (Only visible when chatting) */}
        {!isEmptyState && (
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative bg-[#2F2F2F] rounded-[26px] shadow-lg border border-white/5">
                        <div className="flex items-end p-3 gap-3">
                            <button className="p-2 bg-gray-700/50 hover:bg-gray-600 rounded-full text-white transition-colors mb-0.5">
                                <Plus size={20} />
                            </button>
                            
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Message DasKartAI..."
                                rows={1}
                                className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 resize-none py-3 px-0 max-h-[200px] text-base"
                                style={{ minHeight: '24px' }}
                            />

                            <div className="flex items-center gap-2 mb-0.5">
                                {inputValue.trim() ? (
                                    <button 
                                        onClick={() => { onSendMessage(inputValue); setInputValue(''); }}
                                        className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={onConnect}
                                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                                        title="Start Voice Mode"
                                    >
                                        <AudioLines size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-500 text-center mt-2">
                        DasKartAI can make mistakes. Consider checking important information.
                    </p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
