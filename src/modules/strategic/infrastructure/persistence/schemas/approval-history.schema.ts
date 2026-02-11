/**
 * Drizzle Schema: strategic_approval_history
 *
 * @module strategic/infrastructure/persistence/schemas
 */
import { sql } from 'drizzle-orm';
import {
  varchar,
  int,
  datetime2,
  nvarchar,
  index,
  mssqlTable,
} from 'drizzle-orm/mssql-core';

export const approvalHistoryTable = mssqlTable('strategic_approval_history', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`NEWID()`),

  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  strategyId: varchar('strategy_id', { length: 36 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  fromStatus: varchar('from_status', { length: 50 }).notNull(),
  toStatus: varchar('to_status', { length: 50 }).notNull(),

  actorUserId: int('actor_user_id').notNull(),
  comments: nvarchar('comments', { length: 2000 }),

  createdAt: datetime2('created_at', { precision: 7 })
    .notNull()
    .default(sql`GETDATE()`),
  createdBy: varchar('created_by', { length: 100 }).notNull().default('system'),
  updatedAt: datetime2('updated_at', { precision: 7 })
    .notNull()
    .default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at', { precision: 7 }),
}, (table) => ([
  // SCHEMA-003: Indice composto multi-tenancy obrigatorio
  index('idx_approval_history_tenant').on(table.organizationId, table.branchId),
  // Indice para consultas por estrategia
  index('idx_approval_history_strategy').on(table.strategyId),
]));
