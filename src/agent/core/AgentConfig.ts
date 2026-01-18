/**
 * @description Configurações do Agente AuraCore
 * 
 * Define configurações de LLM, integrações e comportamento do agente.
 */

/**
 * Configurações do modelo Gemini
 */
export interface GeminiConfig {
  /** Modelo principal (default: gemini-3-pro) */
  model: string;
  /** Modelo para tarefas simples (default: gemini-2.5-flash) */
  fastModel: string;
  /** Projeto Google Cloud */
  projectId: string;
  /** Localização do Vertex AI (default: us-central1) */
  location: string;
  /** Máximo de tokens de saída (default: 8192) */
  maxOutputTokens: number;
  /** Temperatura para geração (default: 0.7) */
  temperature: number;
}

/**
 * Configurações do Document AI
 */
export interface DocumentAIConfig {
  /** ID do processador de faturas */
  invoiceProcessorId: string;
  /** ID do processador genérico (OCR) */
  ocrProcessorId?: string;
  /** Localização do processador (default: us) */
  location: string;
}

/**
 * Configurações do Speech-to-Text / Text-to-Speech
 */
export interface SpeechConfig {
  /** Modelo STT (default: chirp_2) */
  sttModel: string;
  /** Modelo TTS (default: chirp_3_hd) */
  ttsModel: string;
  /** Idioma padrão (default: pt-BR) */
  languageCode: string;
  /** Taxa de sample do áudio (default: 16000) */
  sampleRateHertz: number;
}

/**
 * Configurações do Google Workspace
 */
export interface WorkspaceConfig {
  /** Client ID OAuth */
  clientId: string;
  /** Client Secret OAuth */
  clientSecret: string;
  /** Redirect URI para OAuth callback */
  redirectUri: string;
  /** Scopes OAuth necessários */
  scopes: string[];
}

/**
 * Configuração completa do Agente
 */
export interface AgentConfig {
  /** Configurações do Gemini LLM */
  gemini: GeminiConfig;
  /** Configurações do Document AI */
  documentAI: DocumentAIConfig;
  /** Configurações de Speech (opcional) */
  speech?: SpeechConfig;
  /** Configurações do Google Workspace */
  workspace: WorkspaceConfig;
  /** Modo debug (default: false) */
  debug?: boolean;
  /** Timeout para operações em ms (default: 30000) */
  timeoutMs?: number;
}

/**
 * Scopes padrão do Google Workspace
 */
export const DEFAULT_WORKSPACE_SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  // Drive
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  // Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

/**
 * Cria configuração padrão do agente a partir de variáveis de ambiente
 */
export function createDefaultConfig(): AgentConfig {
  return {
    gemini: {
      model: process.env.GEMINI_MODEL || 'gemini-3-pro',
      fastModel: process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash',
      projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
    documentAI: {
      invoiceProcessorId: process.env.DOCUMENT_AI_PROCESSOR_ID || '',
      ocrProcessorId: process.env.DOCUMENT_AI_OCR_PROCESSOR_ID,
      location: process.env.DOCUMENT_AI_LOCATION || 'us',
    },
    speech: {
      sttModel: 'chirp_2',
      ttsModel: 'chirp_3_hd',
      languageCode: 'pt-BR',
      sampleRateHertz: 16000,
    },
    workspace: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
      scopes: [...DEFAULT_WORKSPACE_SCOPES],
    },
    debug: process.env.NODE_ENV === 'development',
    timeoutMs: 30000,
  };
}
