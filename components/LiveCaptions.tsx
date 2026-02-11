
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

  // Determine status label
  let statusLabel = '';
  if (lastMessage.role === 'user') {
      statusLabel = isUserSpeaking ? 'Listening...' : 'You said';
  } else {
      statusLabel = isAiSpeaking ? 'Speaking...' : 'Nova said';
  }

  return (
    <div className="absolute bottom-36 left-0 right-0 px-6 flex flex-col items-center justify-center pointer-events-none z-20">
      <div className="max-w-3xl w-full text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] py-1 px-3 rounded-full border backdrop-blur-md ${
                lastMessage.role === 'user' 
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' 
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
            }`}>
                {statusLabel}
            </span>
        </div>

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
