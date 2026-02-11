
import React from 'react';
import { X, Settings, Mic, MessageSquare, Check, Cpu, Zap, Sparkles, Video } from 'lucide-react';
import { VoiceId } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  selectedVoice: VoiceId;
  onVoiceChange: (voice: VoiceId) => void;
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const VOICES: { id: VoiceId; label: string; desc: string }[] = [
  { id: 'Puck', label: 'Puck', desc: 'Soft, slightly deeper tone' },
  { id: 'Charon', label: 'Charon', desc: 'Deep, assertive, and confident' },
  { id: 'Kore', label: 'Kore', desc: 'Gentle, higher pitch, soothing' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Deep, resonant, and authoritative' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Energetic, higher pitch, friendly' },
];

const MODELS = [
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  selectedVoice, 
  onVoiceChange,
  systemInstruction,
  onSystemInstructionChange,
  selectedModel,
  onModelChange
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
          
          {/* Model Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Cpu size={16} className="text-purple-400" />
              AI Model
            </label>
            <div className="grid grid-cols-1 gap-4">
               {MODELS.map((group) => (
                 <div key={group.category} className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{group.category}</div>
                    {group.items.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => onModelChange(model.id)}
                          className={`w-full relative flex items-center p-3 rounded-xl border transition-all text-left group ${
                            selectedModel === model.id 
                              ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' 
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                          }`}
                        >
                           <div className={`p-2 rounded-lg mr-3 ${selectedModel === model.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                              {model.id.includes('gpt') ? <Zap size={16} /> : model.id.includes('veo') ? <Video size={16} /> : <Sparkles size={16} />}
                           </div>
                           <div className="flex-1">
                              <div className={`font-medium text-sm ${selectedModel === model.id ? 'text-blue-400' : 'text-slate-200'}`}>{model.label}</div>
                              <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{model.desc}</div>
                           </div>
                           {selectedModel === model.id && <Check size={18} className="text-blue-500" />}
                        </button>
                    ))}
                 </div>
               ))}
            </div>
          </div>

          <div className="w-full h-px bg-slate-800" />

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

          <div className="w-full h-px bg-slate-800" />

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
