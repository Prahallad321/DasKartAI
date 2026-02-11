
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, User, Sparkles, History, Menu, Trash2, Download, Copy, Edit, MoreHorizontal, Headphones, Settings, Image as ImageIcon, PanelLeftClose, PanelLeft, ShoppingCart, Globe, ExternalLink, Plus } from 'lucide-react';
import { ChatMessage, User as UserType } from '../types';
import { getChats, deleteChat, clearAllChats, StoredChat } from '../utils/chat-storage';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onConnect: () => void; // Trigger Voice Mode
  user: UserType | null;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenPricing: () => void;
  onOpenGallery: () => void;
}

interface MessageBubbleProps { 
  msg: ChatMessage;
}

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

// Component to display search result previews
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg }) => {
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
      <div className={`w-full text-gray-100 border-b border-black/10 dark:border-gray-900/50 ${!isUser ? 'bg-[#444654]' : 'bg-[#343541]'}`}>
        <div className="text-base gap-4 md:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] p-4 md:py-6 flex lg:px-0 m-auto">
            <div className="flex-shrink-0 flex flex-col relative items-end">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    isUser 
                        ? 'bg-[#5436DA]' 
                        : 'bg-[#19C37D]' 
                }`}>
                    {isUser ? <User size={18} className="text-white" /> : <Logo className="w-5 h-5" disableText />}
                </div>
            </div>
            <div className="relative flex-1 overflow-hidden space-y-2">
                {/* No Name Label in ChatGPT UI */}
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
                
                {/* Search Sources Preview */}
                {msg.groundingMetadata && (
                   <GroundingSources metadata={msg.groundingMetadata} />
                )}
            </div>
        </div>
      </div>
  );
};

const SUGGESTIONS = [
  { text: "Find the best deals on headphones" },
  { text: "Draw a futuristic shopping cart" },
  { text: "Gift ideas for a tech lover" },
  { text: "Search for latest tech news" },
];

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

  useEffect(() => {
    loadHistory();
  }, [messages]); 

  useEffect(() => {
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadHistory = async () => {
    const chats = await getChats();
    setHistory(chats);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
        await deleteChat(id);
        loadHistory();
    }
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

  return (
    <div className="flex h-screen bg-[#343541] text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar - ChatGPT Style (#202123) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[260px] bg-[#202123] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* New Chat Button */}
        <div className="p-2 flex-shrink-0">
            <button 
                onClick={onClearChat}
                className="flex items-center gap-3 px-3 py-3 w-full text-sm text-white bg-transparent hover:bg-[#2A2B32] border border-white/20 rounded-md transition-colors text-left"
            >
                <Plus size={16} />
                <span>New chat</span>
            </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-600">
            {history.length > 0 && <div className="text-xs font-semibold text-gray-500 px-3 py-2">Today</div>}
            {history.map(chat => (
                <div key={chat.id} className="group flex items-center gap-3 px-3 py-3 text-sm text-gray-100 hover:bg-[#2A2B32] rounded-md cursor-pointer transition-colors relative overflow-hidden">
                    <MessageSquare size={16} className="flex-shrink-0 text-gray-400" />
                    <span className="truncate flex-1 pr-6">{chat.title}</span>
                    <button 
                        onClick={(e) => handleDeleteHistory(e, chat.id)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#202123] to-transparent group-hover:from-[#2A2B32]"></div>
                </div>
            ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-white/20 space-y-1">
             <button onClick={onOpenGallery} className="flex items-center gap-3 px-3 py-3 w-full text-sm text-white hover:bg-[#2A2B32] rounded-md transition-colors text-left">
                <ImageIcon size={16} />
                <span>My Recordings</span>
             </button>
             
             <div className="pt-1 border-t border-white/20 mt-1">
                 {user ? (
                    <div className="hover:bg-[#2A2B32] rounded-md transition-colors">
                      <UserMenu onOpenPricing={onOpenPricing} onOpenProfile={onOpenProfile} />
                    </div>
                 ) : (
                    <button onClick={onOpenProfile} className="flex items-center gap-3 px-3 py-3 w-full text-sm text-white hover:bg-[#2A2B32] rounded-md transition-colors text-left">
                        <User size={16} />
                        <span>Log in</span>
                    </button>
                 )}
             </div>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {showSidebar && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#343541]">
        
        {/* Top Navigation Bar (Mobile) */}
        <div className="sticky top-0 z-10 p-2 text-gray-500 bg-[#343541] border-b border-white/5 flex items-center justify-between md:hidden">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-[#40414F] rounded-md">
                <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
                <span className="text-gray-200 font-medium">DasKartAI</span>
            </div>
            <button onClick={onClearChat} className="p-2 hover:bg-[#40414F] rounded-md">
                <Plus size={24} />
            </button>
        </div>
        
        {/* Desktop Sidebar Toggle & Model Select */}
        <div className="hidden md:flex absolute top-2 left-2 z-20">
            {/* Sidebar Toggle */}
             {!showSidebar && (
                <button 
                    onClick={() => setShowSidebar(true)} 
                    className="p-2 text-gray-400 hover:text-white rounded-md transition-colors"
                    title="Open Sidebar"
                >
                    <PanelLeft size={20} />
                </button>
             )}
        </div>

        {/* Model Selector (Centered Top) */}
        <div className="hidden md:flex absolute top-0 w-full justify-center pt-2 z-10">
            <div className="flex items-center gap-2 bg-[#202123] px-3 py-2 rounded-lg cursor-pointer hover:bg-[#2A2B32] transition-colors border border-white/10">
                <span className="text-sm font-semibold text-gray-200">DasKartAI</span>
                <span className="text-[10px] bg-[#19C37D] text-[#202123] px-1.5 py-0.5 rounded font-bold">PLUS</span>
            </div>
        </div>


        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-600">
            {messages.length === 0 ? (
                // Empty State
                <div className="h-full flex flex-col items-center justify-center p-8 space-y-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <Logo className="w-10 h-10" disableText />
                        </div>
                        <h2 className="text-4xl font-semibold text-white">DasKartAI</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => onSendMessage(s.text)}
                                className="px-4 py-3 bg-transparent border border-white/20 rounded-md hover:bg-[#40414F] text-left transition-colors flex items-center justify-between group"
                            >
                                <span className="text-sm text-gray-200">{s.text}</span>
                                <Send size={14} className="opacity-0 group-hover:opacity-50" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                // Messages
                <div className="flex flex-col pb-40 pt-16">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#343541] via-[#343541] to-transparent pt-10 pb-8 px-4">
            <div className="max-w-3xl mx-auto w-full relative">
                
                {/* Voice Mode Button (Floating above input) */}
                <div className="absolute -top-14 right-0 md:-right-12">
                   <button
                        onClick={onConnect}
                        className="p-3 bg-[#40414F] hover:bg-white text-white hover:text-black rounded-full transition-colors shadow-lg border border-white/10"
                        title="Start Voice Mode"
                    >
                        <Headphones size={20} />
                    </button>
                </div>

                <div className="relative flex items-end gap-2 bg-[#40414F] border border-black/20 rounded-xl p-3 shadow-md focus-within:shadow-lg focus-within:border-black/30 transition-all">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a message..."
                        rows={1}
                        className="w-full bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 resize-none py-2 px-1 max-h-[200px] text-base scrollbar-hide"
                        style={{ minHeight: '24px' }}
                    />

                    <button
                        onClick={() => {
                            if (inputValue.trim()) {
                                onSendMessage(inputValue.trim());
                                setInputValue('');
                                if (inputRef.current) inputRef.current.style.height = 'auto';
                            }
                        }}
                        disabled={!inputValue.trim()}
                        className={`p-2 rounded-md transition-colors ${
                            inputValue.trim() 
                             ? 'bg-[#19C37D] text-white hover:bg-[#15a067]' 
                             : 'bg-transparent text-gray-500 cursor-default'
                        }`}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[11px] text-gray-500 text-center mt-2">
                    Free Research Preview. DasKartAI may produce inaccurate information about people, places, or facts.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};
