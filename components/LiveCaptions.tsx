import React from 'react';
import { ChatMessage } from '../types';

interface LiveCaptionsProps {
  lastMessage: ChatMessage | null;
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({ 
  lastMessage, 
  isUserSpeaking,
  isAiSpeaking 
}) => {
  if (!lastMessage) return null;

  return (
    <div className="absolute bottom-36 left-0 right-0 px-6 flex flex-col items-center justify-center pointer-events-none z-20">
      <div className="max-w-3xl w-full text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Caption Text */}
        <p className={`text-lg md:text-2xl font-medium leading-relaxed drop-shadow-2xl transition-all duration-300 ${
            lastMessage.role === 'user' ? 'text-white/90' : 'text-blue-100/90'
        }`}>
           "{lastMessage.text}"
           {!lastMessage.isFinal && (
             <span className="inline-block w-1.5 h-5 ml-1 bg-current align-middle animate-pulse"/>
           )}
        </p>

      </div>
    </div>
  );
};
