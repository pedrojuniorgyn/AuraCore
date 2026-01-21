/**
 * AuraCore SDK Types
 * @module @auracore/sdk/types
 */

// ============================================
// Configuration
// ============================================

export interface AuraCoreConfig {
  /** API Key (ac_live_* or ac_test_*) */
  apiKey: string;
  /** Base URL (default: https://api.auracore.com.br) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: RetryConfig;
}

export interface RetryConfig {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
}

// ============================================
// Agents
// ============================================

export type AgentType =
  | 'fiscal'
  | 'financial'
  | 'accounting'
  | 'tms'
  | 'wms'
  | 'crm'
  | 'fleet'
  | 'strategic';

export interface AgentInfo {
  id: AgentType;
  name: string;
  description: string;
  tools: string[];
  status: 'active' | 'inactive';
}

export interface ChatRequest {
  /** Agent to chat with */
  agent: AgentType;
  /** User message */
  message: string;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Stream response */
  stream?: boolean;
}

export interface ChatResponse {
  /** Agent's response message */
  message: string;
  /** Agent that responded */
  agent: AgentType;
  /** Tools called during response */
  toolCalls: ToolCall[];
  /** Input tokens used */
  tokensInput: number;
  /** Output tokens used */
  tokensOutput: number;
  /** Response duration in ms */
  durationMs: number;
  /** Session ID */
  sessionId?: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

export interface ToolCall {
  /** Tool name */
  tool: string;
  /** Tool input */
  input: Record<string, unknown>;
  /** Tool output */
  output: Record<string, unknown>;
  /** Duration in ms */
  durationMs: number;
}

// ============================================
// Voice
// ============================================

export interface TranscribeRequest {
  /** Audio data (base64 encoded) */
  audio: string;
  /** Audio format */
  format?: 'wav' | 'mp3' | 'ogg' | 'webm';
  /** Language code */
  language?: string;
}

export interface TranscribeResponse {
  /** Transcribed text */
  text: string;
  /** Detected language */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Audio duration in seconds */
  durationSeconds: number;
  /** Segments with timestamps */
  segments: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SynthesizeRequest {
  /** Text to synthesize */
  text: string;
  /** Voice ID */
  voice?: string;
  /** Language code */
  language?: string;
  /** Speech rate (0.5-2.0) */
  rate?: number;
}

export interface SynthesizeResponse {
  /** Audio data (base64 encoded) */
  audio: string;
  /** Audio format */
  format: string;
  /** Duration in seconds */
  durationSeconds: number;
}

// ============================================
// RAG
// ============================================

export interface RAGQueryRequest {
  /** Query text */
  query: string;
  /** Collection to search */
  collection?: string;
  /** Maximum results */
  limit?: number;
  /** Minimum similarity score */
  minScore?: number;
}

export interface RAGQueryResponse {
  /** Generated answer */
  answer: string;
  /** Source documents */
  sources: RAGSource[];
  /** Confidence score */
  confidence: number;
  /** Original query */
  query: string;
}

export interface RAGSource {
  /** Document ID */
  id: string;
  /** Document title */
  title: string;
  /** Relevant content snippet */
  content: string;
  /** Similarity score */
  score: number;
  /** Document metadata */
  metadata: Record<string, unknown>;
}

export interface RAGCollection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Number of documents */
  documentCount: number;
  /** Created date */
  createdAt: string;
}

// ============================================
// Documents
// ============================================

export interface DocumentUploadRequest {
  /** File content (base64 encoded) */
  content: string;
  /** File name */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Document type */
  documentType?: 'danfe' | 'dacte' | 'contract' | 'bank_statement' | 'other';
}

export interface DocumentUploadResponse {
  /** Document ID */
  id: string;
  /** File name */
  filename: string;
  /** Upload status */
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  /** Created date */
  createdAt: string;
}

export interface Document {
  /** Document ID */
  id: string;
  /** File name */
  filename: string;
  /** Status */
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  /** Document type */
  documentType?: string;
  /** Extracted data */
  extractedData?: Record<string, unknown>;
  /** Created date */
  createdAt: string;
  /** Updated date */
  updatedAt: string;
}

// ============================================
// Analytics
// ============================================

export interface UsageStatsRequest {
  /** Start date (ISO format) */
  startDate?: string;
  /** End date (ISO format) */
  endDate?: string;
  /** Group by period */
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

export interface UsageStats {
  /** Total requests */
  totalRequests: number;
  /** Total tokens */
  totalTokens: number;
  /** Total cost estimate (USD) */
  estimatedCost: number;
  /** Stats by agent */
  byAgent: Record<AgentType, AgentStats>;
  /** Stats by period */
  byPeriod: PeriodStats[];
}

export interface AgentStats {
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  avgDurationMs: number;
}

export interface PeriodStats {
  period: string;
  requests: number;
  tokens: number;
}

// ============================================
// Errors
// ============================================

export interface APIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status */
  status: number;
  /** Additional details */
  details?: Record<string, unknown>;
}
