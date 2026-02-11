
import React from 'react';
import { X, Settings, Mic, MessageSquare, Check } from 'lucide-react';
import { VoiceId } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  selectedVoice: VoiceId;
  onVoiceChange: (voice: VoiceId) => void;
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
}

const VOICES: { id: VoiceId; label: string; desc: string }[] = [
  { id: 'Puck', label: 'Puck', desc: 'Soft, slightly deeper tone' },
  { id: 'Charon', label: 'Charon', desc: 'Deep, assertive, and confident' },
  { id: 'Kore', label: 'Kore', desc: 'Gentle, higher pitch, soothing' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Deep, resonant, and authoritative' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Energetic, higher pitch, friendly' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  selectedVoice, 
  onVoiceChange,
  systemInstruction,
  onSystemInstructionChange
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50 flex-shrink-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={20} className="text-blue-500" />
              Settings
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700 shadow-sm"
            >
                <X size={18} />
            </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Voice Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Mic size={16} className="text-blue-400" />
              AI Voice Persona
            </label>
            
            <div className="grid grid-cols-1 gap-3">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => onVoiceChange(voice.id)}
                  className={`relative flex items-center p-4 rounded-xl border transition-all text-left group ${
                    selectedVoice === voice.id 
                      ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                     selectedVoice === voice.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {voice.label[0]}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${selectedVoice === voice.id ? 'text-blue-400' : 'text-slate-200'}`}>
                      {voice.label}
                    </div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                      {voice.desc}
                    </div>
                  </div>
                  {selectedVoice === voice.id && (
                    <div className="absolute right-4 text-blue-500">
                      <Check size={20} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-1">
              Note: Changing voice will take effect on the next connection.
            </p>
          </div>

          {/* System Instruction */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MessageSquare size={16} className="text-orange-400" />
              System Instruction
            </label>
            <div className="relative">
              <textarea
                value={systemInstruction}
                onChange={(e) => onSystemInstructionChange(e.target.value)}
                rows={5}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-4 resize-none placeholder-slate-500 outline-none leading-relaxed"
                placeholder="e.g. You are a helpful assistant..."
              />
            </div>
            <p className="text-xs text-slate-500 px-1">
              Define the AI's personality, tone, and behavior constraints.
            </p>
          </div>

        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
