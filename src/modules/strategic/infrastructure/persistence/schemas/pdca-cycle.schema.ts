/**
 * Schema: PDCA Cycle
 * Histórico de transições do ciclo PDCA para auditoria
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { actionPlanTable } from './action-plan.schema';

export const pdcaCycleTable = mssqlTable('strategic_pdca_cycle', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
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
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
});

// Índices serão criados via migration:
// CREATE INDEX idx_pdca_cycle_action_plan ON strategic_pdca_cycle (action_plan_id);
// CREATE INDEX idx_pdca_cycle_transition ON strategic_pdca_cycle (transitioned_at);
// CREATE INDEX idx_pdca_cycle_phase ON strategic_pdca_cycle (to_phase);

export type PDCACycleRow = typeof pdcaCycleTable.$inferSelect;
export type PDCACycleInsert = typeof pdcaCycleTable.$inferInsert;
