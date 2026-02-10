export interface StreamState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
  barColor?: string;
}

export type VoiceId = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface LiveConfig {
  voice: VoiceId;
}
