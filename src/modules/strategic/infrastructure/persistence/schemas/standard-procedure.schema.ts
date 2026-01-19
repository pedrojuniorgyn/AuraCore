/**
 * Schema: Standard Procedure (Padrão)
 * Padronização de procedimentos após resolução bem-sucedida
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020, ADR-0022
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';
import { actionPlanTable } from './action-plan.schema';

export const standardProcedureTable = mssqlTable('strategic_standard_procedure', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Origem: plano de ação que gerou o padrão
  sourceActionPlanId: varchar('source_action_plan_id', { length: 36 })
    .references(() => actionPlanTable.id),
  
  code: varchar('code', { length: 20 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  
  // Descrição do problema original
  problemDescription: text('problem_description').notNull(),
  
  // Causa raiz identificada
  rootCause: text('root_cause'),
  
  // Solução padronizada
  solution: text('solution').notNull(),
  
  // Procedimento operacional padrão (POP)
  standardOperatingProcedure: text('standard_operating_procedure'),
  
  // Área de aplicação
  department: varchar('department', { length: 100 }),
  processName: varchar('process_name', { length: 200 }),
  
  // Responsável pela manutenção do padrão
  ownerUserId: varchar('owner_user_id', { length: 36 }).notNull(),
  
  // Versão e revisão
  version: int('version').notNull().default(1),
  lastReviewDate: datetime2('last_review_date'),
  nextReviewDate: datetime2('next_review_date'),
  
  // Status: DRAFT | ACTIVE | UNDER_REVIEW | OBSOLETE
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  // Documentos anexos (JSON array de URLs)
  attachments: text('attachments'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_standard_procedure_tenant').on(table.organizationId, table.branchId),
  index('idx_standard_procedure_code').on(table.organizationId, table.branchId, table.code),
  index('idx_standard_procedure_source').on(table.sourceActionPlanId),
  index('idx_standard_procedure_status').on(table.status),
  index('idx_standard_procedure_owner').on(table.ownerUserId),
  index('idx_standard_procedure_review').on(table.nextReviewDate),
]));

export type StandardProcedureRow = typeof standardProcedureTable.$inferSelect;
export type StandardProcedureInsert = typeof standardProcedureTable.$inferInsert;
