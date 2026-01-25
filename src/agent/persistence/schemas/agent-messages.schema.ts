/**
 * Drizzle Schema: agent_messages
 *
 * Tabela para armazenar mensagens de chat do agente AuraCore.
 * Cada mensagem pertence a uma sessão específica.
 *
 * Multi-tenancy: organizationId + branchId (OBRIGATÓRIO - S1.2)
 * Soft delete: N/A (histórico auditável, usar retention policy)
 *
 * @module agent/persistence/schemas
 * @see E-Agent-Fase6
 * @see Sprint Blindagem S1.2
 */

import { sql } from 'drizzle-orm';
import { int, varchar, datetime2, text, index } from 'drizzle-orm/mssql-core';
import { mssqlTable } from '@/shared/infrastructure/database/table-creator';

export const agentMessagesTable = mssqlTable(
  'agent_messages',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    
    // Multi-tenancy (OBRIGATÓRIO - S1.2)
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    toolsUsed: text('tools_used'), // JSON stringified array
    metadata: text('metadata'), // JSON stringified object
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  },
  (table) => ({
    // ✅ SCHEMA-003: Índice composto OBRIGATÓRIO para multi-tenancy (S1.2)
    tenantIdx: index('idx_agent_messages_tenant').on(table.organizationId, table.branchId),
    // Índices para queries
    sessionIdx: index('idx_agent_messages_session').on(table.sessionId),
    createdIdx: index('idx_agent_messages_created').on(table.createdAt),
  })
);

export type AgentMessageRow = typeof agentMessagesTable.$inferSelect;
export type AgentMessageInsert = typeof agentMessagesTable.$inferInsert;
