/**
 * Schema: Notification
 * Tabela: notifications
 * 
 * @module shared/infrastructure/notifications/schemas
 * @see SCHEMA-001 a SCHEMA-010
 */
import { int, varchar, datetime2, bit, index, mssqlTable, text } from 'drizzle-orm/mssql-core';
import { sql } from 'drizzle-orm';

export const notificationTable = mssqlTable(
  'notifications',
  {
    id: int('id').primaryKey().notNull().default(sql`IDENTITY(1,1)`),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id'),
    userId: int('user_id'),
    
    // Tipo e Evento
    type: varchar('type', { length: 20 }).notNull(),
    event: varchar('event', { length: 100 }).notNull(),
    
    // Conteúdo
    title: text('title').notNull(),
    message: text('message'),
    
    // Dados extras (JSON)
    data: text('data'), // JSON string
    
    // Link para ação
    actionUrl: text('action_url'),
    
    // Controle
    isRead: bit('is_read').notNull().default(sql`0`),
    readAt: datetime2('read_at'),
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  },
  (table) => [
    // Índices existentes (SCHEMA-003)
    index('idx_notifications_user').on(table.userId, table.isRead, table.createdAt),
    index('idx_notifications_org').on(table.organizationId, table.createdAt),
    index('idx_notifications_type').on(table.type, table.createdAt),
  ]
);

export type NotificationRow = typeof notificationTable.$inferSelect;
export type NotificationInsert = typeof notificationTable.$inferInsert;
