/**
 * AuraCore TypeScript SDK
 *
 * Official SDK for AuraCore Agents API.
 *
 * @example
 * ```typescript
 * import { AuraCore } from '@auracore/sdk';
 *
 * const client = new AuraCore({ apiKey: 'ac_live_xxx' });
 *
 * // Chat with an agent
 * const response = await client.agents.chat('fiscal', 'Qual o ICMS de SP?');
 * console.log(response.message);
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { AuraCore } from './client';

// Errors
export {
  AuraCoreError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from './errors';

// Types
export type {
  AuraCoreConfig,
  RetryConfig,
  AgentType,
  AgentInfo,
  ChatRequest,
  ChatResponse,
  ToolCall,
  TranscribeRequest,
  TranscribeResponse,
  TranscriptionSegment,
  SynthesizeRequest,
  SynthesizeResponse,
  RAGQueryRequest,
  RAGQueryResponse,
  RAGSource,
  RAGCollection,
  DocumentUploadRequest,
  DocumentUploadResponse,
  Document,
  UsageStatsRequest,
  UsageStats,
  AgentStats,
  PeriodStats,
  APIError,
} from './types';

// Resources (for advanced usage)
export {
  AgentsResource,
  VoiceResource,
  RAGResource,
  DocumentsResource,
  AnalyticsResource,
} from './resources';

// Default export
export { AuraCore as default } from './client';
