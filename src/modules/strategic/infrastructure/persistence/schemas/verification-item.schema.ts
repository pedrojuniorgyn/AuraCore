/**
 * Schema: VerificationItem (Item de Verificação)
 * Mede as CAUSAS que afetam o Item de Controle (Metodologia GEROT/Falconi)
 *
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';
import { controlItemTable } from './control-item.schema';

export const verificationItemTable = mssqlTable('strategic_verification_item', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),

  // Referência ao Item de Controle (relação causa-efeito)
  controlItemId: varchar('control_item_id', { length: 36 })
    .notNull()
    .references(() => controlItemTable.id),

  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),

  // Configuração de verificação
  verificationMethod: varchar('verification_method', { length: 500 }).notNull(),
  responsibleUserId: varchar('responsible_user_id', { length: 36 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // DAILY|WEEKLY|BIWEEKLY|MONTHLY

  // Valores
  standardValue: varchar('standard_value', { length: 100 }).notNull(),
  currentValue: varchar('current_value', { length: 100 }),

  // Verificação
  lastVerifiedAt: datetime2('last_verified_at'),
  lastVerifiedBy: varchar('last_verified_by', { length: 36 }),

  // Status e correlação
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE | INACTIVE
  correlationWeight: int('correlation_weight').notNull().default(50),

  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_verification_item_tenant').on(table.organizationId, table.branchId),
  // Índices adicionais
  index('idx_verification_item_control_item').on(table.controlItemId),
  index('idx_verification_item_responsible').on(table.responsibleUserId),
]));

export type VerificationItemRow = typeof verificationItemTable.$inferSelect;
export type VerificationItemInsert = typeof verificationItemTable.$inferInsert;
