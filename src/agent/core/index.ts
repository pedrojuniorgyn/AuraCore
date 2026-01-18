/**
 * @module agent/core
 * @description Núcleo do Agente AuraCore
 */

export { AuraAgent } from './AuraAgent';
export type { AgentConfig, GeminiConfig, DocumentAIConfig, SpeechConfig, WorkspaceConfig } from './AgentConfig';
export { createDefaultConfig, DEFAULT_WORKSPACE_SCOPES } from './AgentConfig';
export type { 
  AgentContext, 
  AgentExecutionContext,
  UserContext,
  OrganizationContext,
  SessionContext,
  ChatMessage,
  MessageAttachment,
} from './AgentContext';
export { createExecutionContext, createSession, addMessage } from './AgentContext';

// Voice-Enabled Agent
export {
  VoiceEnabledAgent,
  type VoiceConversationOptions,
  type VoiceConversationResult,
} from './VoiceEnabledAgent';
