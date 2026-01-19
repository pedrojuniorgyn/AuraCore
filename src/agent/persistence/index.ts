/**
 * Agent Persistence Module
 *
 * Provides session and message persistence for the AuraCore agent.
 *
 * @module agent/persistence
 * @see E-Agent-Fase6
 */

// Session Store
export {
  SessionStore,
  sessionStore,
  type ChatSession,
  type ChatMessage,
  type CreateSessionParams,
  type ListSessionsParams,
  type AddMessageParams,
  type GetMessagesOptions,
  type PaginatedSessions,
} from './SessionStore';

// Schemas
export {
  agentSessionsTable,
  agentMessagesTable,
  type AgentSessionRow,
  type AgentSessionInsert,
  type AgentMessageRow,
  type AgentMessageInsert,
} from './schemas';
