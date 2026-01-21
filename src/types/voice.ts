/**
 * Types para interface de voz
 */

export type VoiceState = 
  | 'idle'           // Aguardando
  | 'listening'      // Gravando áudio do usuário
  | 'processing'     // Transcrevendo/processando
  | 'speaking'       // Reproduzindo resposta
  | 'error';         // Erro

export type VoiceProvider = 'google' | 'elevenlabs' | 'azure';

export interface VoiceConfig {
  /** Idioma para STT */
  language?: string;
  /** Voz para TTS */
  voice?: string;
  /** Velocidade da fala (0.5 - 2.0) */
  speed?: number;
  /** Provider de TTS */
  provider?: VoiceProvider;
  /** Modo contínuo (não para de ouvir) */
  continuous?: boolean;
  /** Timeout de silêncio em ms */
  silenceTimeout?: number;
}

export interface TranscriptionResult {
  success: boolean;
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
  error?: string;
}

export interface SynthesisResult {
  success: boolean;
  audio_base64?: string;
  audio_format: string;
  error?: string;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  isVoice: boolean;
}

export interface UseVoiceChatOptions {
  /** Tipo do agente */
  agentType?: string;
  /** Contexto adicional */
  context?: Record<string, unknown>;
  /** Configuração de voz */
  config?: VoiceConfig;
  /** Callback quando transcrição é recebida */
  onTranscription?: (text: string) => void;
  /** Callback quando resposta é recebida */
  onResponse?: (text: string) => void;
  /** Callback de erro */
  onError?: (error: Error) => void;
}

export interface UseVoiceChatReturn {
  /** Estado atual da voz */
  state: VoiceState;
  /** Se está gravando */
  isListening: boolean;
  /** Se está processando */
  isProcessing: boolean;
  /** Se está falando */
  isSpeaking: boolean;
  /** Mensagens do chat por voz */
  messages: VoiceMessage[];
  /** Última transcrição */
  lastTranscription: string | null;
  /** Erro atual */
  error: Error | null;
  /** Iniciar gravação */
  startListening: () => Promise<void>;
  /** Parar gravação */
  stopListening: () => Promise<void>;
  /** Toggle gravação */
  toggleListening: () => Promise<void>;
  /** Parar reprodução de áudio */
  stopSpeaking: () => void;
  /** Limpar mensagens */
  clearMessages: () => void;
  /** Verificar se browser suporta */
  isSupported: boolean;
  /** Permissão de microfone */
  hasPermission: boolean | null;
}
