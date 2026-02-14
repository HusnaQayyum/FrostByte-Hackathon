
export enum UserMode {
  SIGNER = 'SIGNER', // Deaf/Mute user signing to camera
  LISTENER = 'LISTENER' // Hearing user speaking/listening
}

export interface Message {
  id: string;
  type: 'text' | 'gesture' | 'audio';
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  signImage?: string; // Base64 of a generated sign for visualization
}

export interface RecognitionState {
  isListening: boolean;
  isWatching: boolean;
  lastGesture?: string;
  confidence: number;
}
