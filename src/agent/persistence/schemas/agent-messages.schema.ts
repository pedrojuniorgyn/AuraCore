/**
 * Drizzle Schema: agent_messages
 *
 * Tabela para armazenar mensagens de chat do agente AuraCore.
 * Cada mensagem pertence a uma sessão específica.
 *
 * Índices recomendados (criar via migration):
 * - idx_agent_messages_session ON (session_id)
 * - idx_agent_messages_created ON (created_at)
 *
 * @module agent/persistence/schemas
 * @see E-Agent-Fase6
 */

import { sql } from 'drizzle-orm';
import { varchar, datetime, text, mssqlTable } from 'drizzle-orm/mssql-core';

export const agentMessagesTable = mssqlTable('agent_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  toolsUsed: text('tools_used'), // JSON stringified array
  metadata: text('metadata'), // JSON stringified object
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
});

export type AgentMessageRow = typeof agentMessagesTable.$inferSelect;
export type AgentMessageInsert = typeof agentMessagesTable.$inferInsert;
