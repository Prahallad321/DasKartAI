import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, User, Sparkles, History, ArrowLeft, Trash2, Download, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types';
import { getChats, deleteChat, clearAllChats, StoredChat } from '../utils/chat-storage';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ messages: liveMessages, onSendMessage, onClose }) => {
  const [view, setView] = useState<'live' | 'history' | 'details'>('live');
  const [history, setHistory] = useState<StoredChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<StoredChat | null>(null);
  
  // Live Chat State
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'live' || view === 'details') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveMessages, view, selectedChat]);

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view]);

  const loadHistory = async () => {
    const chats = await getChats();
    setHistory(chats);
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation?")) {
      await deleteChat(id);
      loadHistory();
      if (selectedChat?.id === id) {
        setView('history');
        setSelectedChat(null);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete ALL conversation history? This cannot be undone.")) {
      await clearAllChats();
      loadHistory();
    }
  };

  const handleExport = (chat: StoredChat | ChatMessage[]) => {
    const msgs = Array.isArray(chat) ? chat : chat.messages;
    const text = msgs.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nova-Chat-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex items-start gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
          </div>
          <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`relative px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white/10 text-gray-100 rounded-tl-none'
            }`}>
              {msg.text}
              <button 
                onClick={handleCopy}
                className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity ${
                    msg.role === 'user' ? '-left-8' : '-right-8'
                }`}
                title="Copy text"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          {view !== 'live' ? (
            <button 
                onClick={() => {
                    if (view === 'details') setView('history');
                    else setView('live');
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-gray-300" />
            </button>
          ) : (
             <MessageSquare size={20} className="text-nova-blue" />
          )}
          <h2 className="font-semibold text-white">
              {view === 'live' ? 'Live Chat' : view === 'history' ? 'Conversations' : 'Archive'}
          </h2>
        </div>
        
        <div className="flex items-center gap-1">
            {view === 'live' && (
                <button 
                    onClick={() => setView('history')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    title="History"
                >
                    <History size={18} />
                </button>
            )}
             {view === 'details' && selectedChat && (
                <button 
                    onClick={() => handleExport(selectedChat)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    title="Download Transcript"
                >
                    <Download size={18} />
                </button>
            )}
            <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
            <X size={20} />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        
        {/* LIVE VIEW */}
        {view === 'live' && (
            <div className="space-y-4 pb-2">
                {liveMessages.length === 0 ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
                    <MessageSquare size={48} />
                    <p>Start a conversation...</p>
                </div>
                ) : (
                liveMessages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>
        )}

        {/* HISTORY LIST VIEW */}
        {view === 'history' && (
            <div className="space-y-2">
                {history.length > 0 && (
                    <div className="flex justify-end mb-2">
                         <button
                            onClick={handleClearAll}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
                         >
                            <Trash2 size={12} /> Clear All History
                         </button>
                    </div>
                )}

                {history.length === 0 ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
                        <History size={48} />
                        <p>No saved conversations</p>
                    </div>
                ) : (
                    history.map(chat => (
                        <div 
                            key={chat.id}
                            onClick={() => {
                                setSelectedChat(chat);
                                setView('details');
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 cursor-pointer transition-colors group relative"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-medium text-gray-200 truncate pr-8">{chat.title}</h3>
                                <span className="text-[10px] text-gray-500">{new Date(chat.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{chat.messages.length} messages</p>
                            
                            <button 
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* DETAILS VIEW */}
        {view === 'details' && selectedChat && (
             <div className="space-y-4 pb-2">
                 <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 mb-4 text-xs text-blue-200 flex items-center gap-2">
                     <History size={12} />
                     <span>Archived conversation from {new Date(selectedChat.timestamp).toLocaleString()}</span>
                 </div>
                {selectedChat.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                <div ref={messagesEndRef} />
             </div>
        )}
      </div>

      {/* Live Input */}
      {view === 'live' && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20">
            <div className="relative flex items-center">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-nova-blue focus:ring-1 focus:ring-nova-blue transition-all"
            />
            <button
                type="submit"
                disabled={!inputValue.trim()}
                className="absolute right-2 p-2 bg-nova-blue hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            >
                <Send size={16} />
            </button>
            </div>
        </form>
      )}
      
      {/* Archive Actions Footer */}
      {view === 'details' && selectedChat && (
          <div className="p-4 border-t border-white/10 bg-black/20 grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleExport(selectedChat)}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
              >
                  <Download size={16} /> Export
              </button>
              <button 
                onClick={(e) => handleDeleteChat(e, selectedChat.id)}
                className="flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                  <Trash2 size={16} /> Delete
              </button>
          </div>
      )}
    </div>
  );
};
