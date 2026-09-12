export interface TTSProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  synthesize(text: string, voice: VoiceConfig): Promise<ArrayBuffer>;
  listVoices(): Promise<VoiceInfo[]>;
}

export interface VoiceConfig {
  voiceId: string;
  model?: string;
  speed?: number;
  stability?: number;
  style?: number;
  providerSettings?: Record<string, unknown>;
}

export interface VoiceInfo {
  id: string;
  name: string;
  provider: string;
  language?: string;
  preview?: string;
}
