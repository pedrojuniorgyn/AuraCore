/**
 * Drizzle Schema: agent_sessions
 *
 * Tabela para armazenar sessões de chat do agente AuraCore.
 * Cada sessão pertence a um usuário e organização específicos.
 *
 * Índices recomendados (criar via migration):
 * - idx_agent_sessions_tenant ON (organization_id, branch_id)
 * - idx_agent_sessions_user ON (user_id, organization_id, branch_id)
 * - idx_agent_sessions_updated ON (updated_at)
 *
 * @module agent/persistence/schemas
 * @see E-Agent-Fase6
 */

import { sql } from 'drizzle-orm';
import { varchar, int, datetime, text, mssqlTable } from 'drizzle-orm/mssql-core';

export const agentSessionsTable = mssqlTable('agent_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  metadata: text('metadata'), // JSON stringified
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
});

export type AgentSessionRow = typeof agentSessionsTable.$inferSelect;
export type AgentSessionInsert = typeof agentSessionsTable.$inferInsert;
