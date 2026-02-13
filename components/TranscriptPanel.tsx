import React, { useState, useRef, useEffect } from 'react';
import { X, Search, User, Sparkles, Copy, Check, ArrowDown, AudioLines } from 'lucide-react';
import { ChatMessage } from '../types';

interface TranscriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ isOpen, onClose, messages }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages based on search
  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll, searchQuery]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <AudioLines size={18} className="text-blue-400" />
            Audio Conversion
          </h3>
          <p className="text-slate-400 text-xs">Real-time Human ↔ AI Transcript</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-white/5 bg-slate-900/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Messages List */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
             <Search size={32} className="opacity-20" />
             <p className="text-sm">No conversion history found</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg mt-1 ${
                  isUser ? 'bg-orange-600' : 'bg-blue-600'
                }`}>
                  {isUser ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isUser ? 'Human' : 'AI Assistant'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  
                  <div className={`group relative text-sm leading-relaxed ${
                    isUser 
                      ? 'p-3.5 bg-orange-600/10 border border-orange-500/30 text-orange-100 rounded-2xl rounded-tr-none' 
                      : 'py-1 text-blue-100' // Removed box styling for AI
                  }`}>
                    {/* Message Text */}
                    {msg.text}
                    
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className={`absolute top-2 ${isUser ? 'left-2' : '-right-8'} p-1.5 rounded-md bg-black/20 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:text-white transition-all`}
                      title="Copy text"
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scroll to Bottom Indicator */}
      {!autoScroll && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button 
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-900/20 text-xs font-semibold hover:bg-blue-500 transition-transform hover:scale-105"
          >
            <ArrowDown size={14} />
            Resume Live
          </button>
        </div>
      )}
    </div>
  );
};
