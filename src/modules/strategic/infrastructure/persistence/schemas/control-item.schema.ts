/**
 * Schema: Control Item (IC - Item de Controle)
 * Indicadores que medem o RESULTADO de um processo (GEROT)
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';

export const controlItemTable = mssqlTable('strategic_control_item', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  // Processo vinculado
  processName: varchar('process_name', { length: 200 }).notNull(),
  processOwner: varchar('process_owner', { length: 100 }).notNull(),
  processOwnerUserId: varchar('process_owner_user_id', { length: 36 }).notNull(),
  
  // Configuração
  unit: varchar('unit', { length: 20 }).notNull(),
  polarity: varchar('polarity', { length: 10 }).notNull().default('UP'), // UP | DOWN
  frequency: varchar('frequency', { length: 20 }).notNull().default('MONTHLY'),
  
  // Valores
  targetValue: decimal('target_value', { precision: 18, scale: 4 }).notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }).notNull().default('0'),
  upperLimit: decimal('upper_limit', { precision: 18, scale: 4 }), // Limite superior
  lowerLimit: decimal('lower_limit', { precision: 18, scale: 4 }), // Limite inferior
  
  // Status: NORMAL | WARNING | ANOMALY
  status: varchar('status', { length: 20 }).notNull().default('NORMAL'),
  lastMeasuredAt: datetime2('last_measured_at'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_control_item_tenant').on(table.organizationId, table.branchId),
  // Índices adicionais
  index('idx_control_item_code').on(table.organizationId, table.branchId, table.code),
  index('idx_control_item_status').on(table.status),
  index('idx_control_item_owner').on(table.processOwnerUserId),
]));

export type ControlItemRow = typeof controlItemTable.$inferSelect;
export type ControlItemInsert = typeof controlItemTable.$inferInsert;
