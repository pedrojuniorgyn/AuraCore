/**
 * Schema: Verification Item (IV - Item de Verificação)
 * Indicadores que medem as CAUSAS do resultado (GEROT)
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { controlItemTable } from './control-item.schema';

export const verificationItemTable = mssqlTable('strategic_verification_item', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // IV está vinculado a um IC (relação causa-efeito)
  controlItemId: varchar('control_item_id', { length: 36 })
    .notNull()
    .references(() => controlItemTable.id),
  
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  // Configuração
  unit: varchar('unit', { length: 20 }).notNull(),
  polarity: varchar('polarity', { length: 10 }).notNull().default('UP'), // UP | DOWN
  frequency: varchar('frequency', { length: 20 }).notNull().default('DAILY'),
  
  // Peso da influência no IC (0-100%)
  influenceWeight: decimal('influence_weight', { precision: 5, scale: 2 }).notNull().default('100.00'),
  
  // Valores
  targetValue: decimal('target_value', { precision: 18, scale: 4 }).notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }).notNull().default('0'),
  
  // Responsável pela medição
  measuredBy: varchar('measured_by', { length: 36 }),
  lastMeasuredAt: datetime2('last_measured_at'),
  
  // Status: OK | DEVIATION
  status: varchar('status', { length: 20 }).notNull().default('OK'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_verification_item_tenant ON strategic_verification_item (organization_id, branch_id);
// CREATE INDEX idx_verification_item_control ON strategic_verification_item (control_item_id);
// CREATE INDEX idx_verification_item_code ON strategic_verification_item (organization_id, branch_id, code);
// CREATE INDEX idx_verification_item_status ON strategic_verification_item (status);

export type VerificationItemRow = typeof verificationItemTable.$inferSelect;
export type VerificationItemInsert = typeof verificationItemTable.$inferInsert;
