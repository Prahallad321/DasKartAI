
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

export interface GroundingMetadata {
  groundingChunks?: {
    web?: {
      uri?: string;
      title?: string;
    };
    maps?: {
      uri?: string;
      title?: string;
    };
  }[];
  groundingSupports?: any[];
  webSearchQueries?: string[];
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isFinal?: boolean;
  image?: string; // Base64 string for generated images
  video?: string; // URI or Base64 for generated videos
  attachments?: Attachment[]; // User uploaded attachments
  groundingMetadata?: GroundingMetadata; // For search results
}

export type PlanType = 'trial' | 'pro';
export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanType;
  role: UserRole;
  status: UserStatus;
  trialEndsAt: number; // Timestamp
  lastLogin?: number;
  subscriptionType?: 'trial' | 'paid';
  subscriptionStatus?: 'active' | 'expired';
  subscriptionStartAt?: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface SystemStats {
  totalUsers: number;
  activeNow: number;
  totalMessages: number;
  storageUsed: string;
  revenue: string;
}

export interface AuditLog {
  id: string;
  action: string;
  adminId: string;
  targetId?: string;
  details: string;
  timestamp: number;
}

export interface GlobalSettings {
  maintenanceMode: boolean;
  allowSignups: boolean;
  enableImageGen: boolean;
  systemInstruction: string;
}
