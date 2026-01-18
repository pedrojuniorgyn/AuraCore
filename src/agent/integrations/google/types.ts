/**
 * @description Tipos para integrações Google Cloud e Workspace
 */

// ============================================================================
// GOOGLE CLOUD - Gemini / Vertex AI
// ============================================================================

/**
 * Resposta de geração do Gemini
 */
export interface GeminiResponse {
  text: string;
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'OTHER';
  usage: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

/**
 * Conteúdo para Gemini (suporta texto e imagens)
 */
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export type GeminiPart = 
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Opções de geração do Gemini
 */
export interface GenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

// ============================================================================
// GOOGLE CLOUD - Document AI
// ============================================================================

/**
 * Documento processado pelo Document AI
 */
export interface ProcessedDocument {
  /** Texto extraído do documento */
  text: string;
  /** Entidades extraídas (faturas, etc) */
  entities: DocumentEntity[];
  /** Páginas do documento */
  pages: DocumentPage[];
  /** MIME type do documento original */
  mimeType: string;
}

/**
 * Entidade extraída do documento
 */
export interface DocumentEntity {
  /** Tipo da entidade (invoice_id, total_amount, etc) */
  type: string;
  /** Valor da entidade */
  value: string;
  /** Confiança (0-1) */
  confidence: number;
  /** Propriedades aninhadas */
  properties?: DocumentEntity[];
}

/**
 * Página do documento
 */
export interface DocumentPage {
  /** Número da página (1-indexed) */
  pageNumber: number;
  /** Dimensões */
  dimension: { width: number; height: number };
  /** Blocos de texto */
  blocks: TextBlock[];
}

/**
 * Bloco de texto
 */
export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

/**
 * Bounding box para OCR
 */
export interface BoundingBox {
  vertices: Array<{ x: number; y: number }>;
}

// ============================================================================
// GOOGLE CLOUD - Speech
// ============================================================================

/**
 * Resultado de transcrição (STT)
 */
export interface TranscriptionResult {
  /** Texto transcrito */
  transcript: string;
  /** Confiança da transcrição (0-1) */
  confidence: number;
  /** Palavras individuais com timestamps */
  words?: TranscribedWord[];
  /** Idioma detectado */
  languageCode: string;
}

/**
 * Palavra transcrita com timestamp
 */
export interface TranscribedWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Resultado de síntese de voz (TTS)
 */
export interface SynthesisResult {
  /** Áudio em base64 */
  audioContent: string;
  /** MIME type do áudio */
  mimeType: string;
  /** Duração em segundos */
  durationSeconds: number;
}

// ============================================================================
// GOOGLE WORKSPACE - Gmail
// ============================================================================

/**
 * Email do Gmail
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: Date;
  labels: string[];
  attachments: GmailAttachment[];
}

/**
 * Anexo do Gmail
 */
export interface GmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ============================================================================
// GOOGLE WORKSPACE - Drive
// ============================================================================

/**
 * Arquivo do Drive
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime: Date;
  modifiedTime: Date;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
}

// ============================================================================
// GOOGLE WORKSPACE - Calendar
// ============================================================================

/**
 * Evento do Calendar
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: CalendarAttendee[];
  htmlLink: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

/**
 * Participante do evento
 */
export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

// ============================================================================
// GOOGLE WORKSPACE - Sheets
// ============================================================================

/**
 * Resultado de leitura de planilha
 */
export interface SheetData {
  spreadsheetId: string;
  range: string;
  values: string[][];
}

/**
 * Resultado de atualização de planilha
 */
export interface SheetUpdateResult {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}
