export interface VoiceProfile {
  id: string;
  name: string;
  provider: string;
  voiceId: string;
  model?: string;
  speed?: number;
  stability?: number;
  style?: number;
  pronunciationDictionary?: PronunciationEntry[];
  providerSettings?: Record<string, unknown>;
}

export interface PronunciationEntry {
  word: string;
  phonetic: string;
  ipa?: string;
}
