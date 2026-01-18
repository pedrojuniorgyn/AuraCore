/**
 * @module agent/voice/types
 * @description Tipos e interfaces para interação por voz
 * 
 * Preparação para integração com:
 * - Google Speech-to-Text (Chirp 3)
 * - Google Text-to-Speech
 * - WebRTC para streaming
 */

/**
 * Formato de áudio suportado
 */
export type AudioFormat = 
  | 'audio/webm'
  | 'audio/wav'
  | 'audio/mp3'
  | 'audio/ogg'
  | 'audio/flac';

/**
 * Idioma suportado
 */
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

/**
 * Status da sessão de voz
 */
export type VoiceSessionStatus = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

/**
 * Configuração de Speech-to-Text
 */
export interface SpeechToTextConfig {
  /** Idioma do áudio */
  language: SupportedLanguage;
  /** Modelo a usar (Chirp 3 para português) */
  model?: 'chirp' | 'chirp_2' | 'latest_short' | 'latest_long';
  /** Habilitar pontuação automática */
  enableAutoPunctuation?: boolean;
  /** Habilitar diarização (múltiplos falantes) */
  enableSpeakerDiarization?: boolean;
  /** Número máximo de alternativas de transcrição */
  maxAlternatives?: number;
  /** Filtrar palavrões */
  profanityFilter?: boolean;
  /** Palavras-chave para boost de reconhecimento */
  speechContexts?: SpeechContext[];
}

/**
 * Contexto de fala para melhorar reconhecimento
 */
export interface SpeechContext {
  /** Frases para boost */
  phrases: string[];
  /** Boost de probabilidade (0-20) */
  boost?: number;
}

/**
 * Resultado de transcrição de voz
 */
export interface VoiceTranscriptionResult {
  /** Texto transcrito */
  transcript: string;
  /** Confiança (0-1) */
  confidence: number;
  /** Alternativas de transcrição */
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  /** Palavras com timestamps */
  words?: TranscriptionWord[];
  /** Idioma detectado */
  detectedLanguage?: string;
}

/**
 * Palavra com timestamp
 */
export interface TranscriptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speakerTag?: number;
}

/**
 * Configuração de Text-to-Speech
 */
export interface TextToSpeechConfig {
  /** Idioma */
  language: SupportedLanguage;
  /** Voz a usar */
  voice?: VoiceConfig;
  /** Formato de saída */
  audioFormat?: AudioFormat;
  /** Velocidade (0.25 a 4.0, default 1.0) */
  speakingRate?: number;
  /** Pitch (-20 a 20 semitones, default 0) */
  pitch?: number;
  /** Volume em dB (-96 a 16, default 0) */
  volumeGainDb?: number;
}

/**
 * Configuração de voz
 */
export interface VoiceConfig {
  /** Nome da voz */
  name: string;
  /** Gênero */
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  /** Tipo de voz */
  type: 'STANDARD' | 'WAVENET' | 'NEURAL2' | 'JOURNEY';
}

/**
 * Resultado de síntese de voz para sessão
 */
export interface VoiceSynthesisResult {
  /** Áudio em base64 */
  audioContent: string;
  /** Formato do áudio */
  audioFormat: AudioFormat;
  /** Duração em segundos */
  durationSeconds?: number;
}

/**
 * Sessão de voz
 */
export interface VoiceSession {
  /** ID da sessão */
  sessionId: string;
  /** Status atual */
  status: VoiceSessionStatus;
  /** Configuração de STT */
  sttConfig: SpeechToTextConfig;
  /** Configuração de TTS */
  ttsConfig: TextToSpeechConfig;
  /** Histórico de transcrições */
  transcriptionHistory: VoiceTranscriptionResult[];
  /** Timestamp de início */
  startedAt: Date;
  /** Timestamp da última atividade */
  lastActivityAt: Date;
}

/**
 * Evento de voz
 */
export type VoiceEvent = 
  | { type: 'transcription'; data: VoiceTranscriptionResult }
  | { type: 'synthesis'; data: VoiceSynthesisResult }
  | { type: 'status_change'; status: VoiceSessionStatus }
  | { type: 'error'; error: string };

/**
 * Handler de eventos de voz
 */
export type VoiceEventHandler = (event: VoiceEvent) => void;

/**
 * Vozes padrão para português brasileiro
 */
export const DEFAULT_PT_BR_VOICES: VoiceConfig[] = [
  { name: 'pt-BR-Neural2-A', gender: 'FEMALE', type: 'NEURAL2' },
  { name: 'pt-BR-Neural2-B', gender: 'MALE', type: 'NEURAL2' },
  { name: 'pt-BR-Neural2-C', gender: 'FEMALE', type: 'NEURAL2' },
  { name: 'pt-BR-Wavenet-A', gender: 'FEMALE', type: 'WAVENET' },
  { name: 'pt-BR-Wavenet-B', gender: 'MALE', type: 'WAVENET' },
  { name: 'pt-BR-Standard-A', gender: 'FEMALE', type: 'STANDARD' },
  { name: 'pt-BR-Standard-B', gender: 'MALE', type: 'STANDARD' },
];

/**
 * Contextos de fala para termos fiscais brasileiros
 */
export const FISCAL_SPEECH_CONTEXT: SpeechContext = {
  phrases: [
    'NFe', 'nota fiscal', 'DANFE', 'CTe', 'conhecimento de transporte',
    'ICMS', 'PIS', 'COFINS', 'IPI', 'ISS',
    'CFOP', 'NCM', 'CNPJ', 'CPF',
    'SPED', 'EFD', 'escrituração',
    'entrada', 'saída', 'devolução', 'transferência',
    'importar', 'exportar', 'consultar',
    'filial', 'matriz', 'organização',
  ],
  boost: 15,
};

/**
 * Contextos de fala para termos logísticos
 */
export const LOGISTICS_SPEECH_CONTEXT: SpeechContext = {
  phrases: [
    'embarque', 'coleta', 'entrega',
    'romaneio', 'manifesto', 'MDFe',
    'motorista', 'veículo', 'placa',
    'frete', 'peso', 'cubagem',
    'cliente', 'destinatário', 'remetente',
    'rastrear', 'status', 'previsão',
  ],
  boost: 10,
};
