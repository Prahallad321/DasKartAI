
import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Circle, Square } from 'lucide-react';

interface ControlTrayProps {
  isConnected: boolean;
  isMicOn: boolean;
  isCamOn: boolean;
  isRecording: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleRecord: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSettings?: () => void;
}

export const ControlTray: React.FC<ControlTrayProps> = ({
  isConnected,
  isMicOn,
  isCamOn,
  isRecording,
  onToggleMic,
  onToggleCam,
  onToggleRecord,
  onConnect,
  onDisconnect
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-full shadow-2xl ring-1 ring-black/50">
        
        {isConnected ? (
          <>
            <button
              onClick={onToggleMic}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button
              onClick={onToggleCam}
              className={`p-4 rounded-full transition-all duration-200 ${
                isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

             <button
              onClick={onToggleRecord}
              disabled={!isCamOn}
              className={`p-4 rounded-full transition-all duration-200 ${
                !isCamOn 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : isRecording 
                    ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isRecording ? <Square size={24} fill="currentColor" /> : <Circle size={24} className={isRecording ? "text-white" : "text-red-500"} fill={isRecording ? "currentColor" : "none"} />}
            </button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
              onClick={onDisconnect}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg hover:shadow-red-600/30"
            >
              <PhoneOff size={24} />
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-900/40 font-semibold"
          >
            <Phone size={24} />
            <span>Connect to Nova</span>
          </button>
        )}
      </div>
    </div>
  );
};
