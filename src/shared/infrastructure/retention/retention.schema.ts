/**
 * Retention Policies Schema
 * 
 * Schema para armazenar configurações de políticas de retenção de dados.
 * 
 * Multi-tenancy: organizationId + branchId (OBRIGATÓRIO - S1.2)
 * Soft delete: N/A (configuração, não deletável - usar isActive)
 * 
 * @see Sprint Blindagem S1.2
 */

import { sql } from 'drizzle-orm';
import { int, varchar, datetime2, index, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Tabela de configuração de políticas de retenção
 */
export const retentionPolicies = mssqlTable(
  'retention_policies',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    
    // Multi-tenancy (OBRIGATÓRIO - S1.2)
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
    // Identificação
    policyName: varchar('policy_name', { length: 100 }).notNull(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    
    // Configuração
    retentionDays: int('retention_days').notNull(),
    dateColumn: varchar('date_column', { length: 100 }).notNull().default('created_at'),
    
    // Condições adicionais (ex: "status = 'COMPLETED'")
    additionalConditions: varchar('additional_conditions', { length: 1000 }),
    
    // Status (1 = ativo, 0 = inativo)
    isActive: int('is_active').notNull().default(1),
    lastRunAt: datetime2('last_run_at'),
    lastRunRecordsDeleted: int('last_run_records_deleted'),
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
    updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  },
  (table) => [
    // ✅ SCHEMA-003: Índice composto OBRIGATÓRIO para multi-tenancy (S1.2)
    index('idx_retention_tenant').on(table.organizationId, table.branchId),
    // Índices para queries
    index('idx_retention_policies_name').on(table.policyName),
    index('idx_retention_policies_table').on(table.tableName),
  ]
);

export type RetentionPolicyRow = typeof retentionPolicies.$inferSelect;
export type RetentionPolicyInsert = typeof retentionPolicies.$inferInsert;
