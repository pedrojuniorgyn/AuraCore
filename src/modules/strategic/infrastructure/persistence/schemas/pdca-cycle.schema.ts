/**
 * Schema: PDCA Cycle
 * Histórico de transições do ciclo PDCA para auditoria
 * 
 * Multi-tenancy: organizationId + branchId (OBRIGATÓRIO - S1.2)
 * Soft delete: N/A (histórico auditável, não deletável)
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 * @see Sprint Blindagem S1.2
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, index } from 'drizzle-orm/mssql-core';
import { mssqlTable } from '@/shared/infrastructure/database/table-creator';
import { actionPlanTable } from './action-plan.schema';

export const pdcaCycleTable = mssqlTable(
  'strategic_pdca_cycle',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    
    // Multi-tenancy (OBRIGATÓRIO - S1.2)
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
    actionPlanId: varchar('action_plan_id', { length: 36 })
      .notNull()
      .references(() => actionPlanTable.id),
    
    // Transição
    fromPhase: varchar('from_phase', { length: 10 }).notNull(), // PLAN | DO | CHECK | ACT
    toPhase: varchar('to_phase', { length: 10 }).notNull(), // PLAN | DO | CHECK | ACT
    
    // Justificativa da transição
    transitionReason: text('transition_reason'),
    
    // Evidências da transição
    evidences: text('evidences'), // JSON array
    
    // Métricas no momento da transição
    completionPercent: int('completion_percent').notNull(),
    
    // Quem e quando
    transitionedBy: varchar('transitioned_by', { length: 36 }).notNull(),
    transitionedAt: datetime2('transitioned_at').notNull(),
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  },
  (table) => ({
    // ✅ SCHEMA-003: Índice composto OBRIGATÓRIO para multi-tenancy (S1.2)
    tenantIdx: index('idx_pdca_cycle_tenant').on(table.organizationId, table.branchId),
    // Índices para queries
    actionPlanIdx: index('idx_pdca_cycle_action_plan').on(table.actionPlanId),
    transitionIdx: index('idx_pdca_cycle_transition').on(table.transitionedAt),
    phaseIdx: index('idx_pdca_cycle_phase').on(table.toPhase),
  })
);

export type PDCACycleRow = typeof pdcaCycleTable.$inferSelect;
export type PDCACycleInsert = typeof pdcaCycleTable.$inferInsert;
