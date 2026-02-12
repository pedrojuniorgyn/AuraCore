/**
 * 📋 CFOP Determination Schema - Drizzle ORM (SCHEMA-001 a SCHEMA-010)
 * 
 * Tabela de mapeamento operação → CFOP.
 * F3.3: CFOP Determination
 */
import { sql } from 'drizzle-orm';
import { varchar, int, datetime2, index, bit, mssqlTable } from 'drizzle-orm/mssql-core';

export const cfopDeterminationTable = mssqlTable(
  'cfop_determination',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    operationType: varchar('operation_type', { length: 50 }).notNull(),
    direction: varchar('direction', { length: 20 }).notNull(), // ENTRY | EXIT
    scope: varchar('scope', { length: 20 }).notNull(), // INTRASTATE | INTERSTATE | FOREIGN
    taxRegime: varchar('tax_regime', { length: 30 }),
    documentType: varchar('document_type', { length: 20 }),
    cfopCode: varchar('cfop_code', { length: 4 }).notNull(),
    cfopDescription: varchar('cfop_description', { length: 200 }).notNull(),
    isDefault: bit('is_default').notNull().default(false),
    priority: int('priority').notNull().default(100),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
    deletedAt: datetime2('deleted_at'),
  },
  (table) => ({
    // SCHEMA-003: Índice composto multi-tenancy
    tenantIdx: index('idx_cfop_det_tenant').on(table.organizationId),
    // Índice para lookup rápido
    lookupIdx: index('idx_cfop_det_lookup').on(
      table.organizationId, table.operationType, table.direction, table.scope
    ),
  })
);

export type CFOPDeterminationRow = typeof cfopDeterminationTable.$inferSelect;
export type CFOPDeterminationInsert = typeof cfopDeterminationTable.$inferInsert;
