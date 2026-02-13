import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface LiveChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({ isOpen, onClose, messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="absolute inset-x-4 bottom-32 md:right-4 md:left-auto md:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] md:max-h-[70vh] animate-in slide-in-from-bottom-5 fade-in duration-300 z-40 ring-1 ring-white/5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl">
             <MessageSquare size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Live Chat</h3>
            <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700/50" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 opacity-60">
            <MessageSquare size={40} strokeWidth={1.5} />
            <p className="text-sm">Type a message to chat with AI</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-auto ${isUser ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                        {isUser ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                            isUser 
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-none shadow-sm' 
                                : 'text-slate-200 px-0 py-1' // Removed box styling for AI
                        }`}>
                            {msg.text}
                        </div>
                        {/* Typing indicator logic could go here if checking !isFinal */}
                    </div>
                </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/40 border-t border-white/10 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-800/80 border border-white/10 text-white text-sm rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-slate-500 transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-lg hover:shadow-blue-500/25 active:scale-95"
          >
            <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};
