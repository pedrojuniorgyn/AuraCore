/**
 * Schema: Action Plan Follow-up (3G - Falconi)
 * GEMBA/GEMBUTSU/GENJITSU - Verificação in loco
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0022
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, bit, mssqlTable } from 'drizzle-orm/mssql-core';
import { actionPlanTable } from './action-plan.schema';

export const actionPlanFollowUpTable = mssqlTable('strategic_action_plan_follow_up', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  actionPlanId: varchar('action_plan_id', { length: 36 })
    .notNull()
    .references(() => actionPlanTable.id),
  
  followUpNumber: int('follow_up_number').notNull(),
  followUpDate: datetime2('follow_up_date').notNull(),
  
  // 3G (GEMBA/GEMBUTSU/GENJITSU)
  gembaLocal: varchar('gemba_local', { length: 500 }).notNull(), // 現場 - Onde verificou
  gembutsuObservation: text('gembutsu_observation').notNull(), // 現物 - O que observou
  genjitsuData: text('genjitsu_data').notNull(), // 現実 - Dados coletados
  
  // Resultado da verificação
  executionStatus: varchar('execution_status', { length: 20 }).notNull(), // EXECUTED_OK | EXECUTED_PARTIAL | NOT_EXECUTED | BLOCKED
  executionPercent: decimal('execution_percent', { precision: 5, scale: 2 }).notNull(),
  problemsObserved: text('problems_observed'),
  problemSeverity: varchar('problem_severity', { length: 20 }), // LOW | MEDIUM | HIGH | CRITICAL
  
  // Reproposição (máximo 3 - ADR-0022)
  requiresNewPlan: bit('requires_new_plan').notNull().default(false),
  newPlanDescription: text('new_plan_description'),
  newPlanAssignedTo: varchar('new_plan_assigned_to', { length: 36 }),
  childActionPlanId: varchar('child_action_plan_id', { length: 36 }),
  
  // Auditoria
  verifiedBy: varchar('verified_by', { length: 36 }).notNull(),
  verifiedAt: datetime2('verified_at').notNull(),
  evidenceUrls: text('evidence_urls'), // JSON array
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
});

// Índices serão criados via migration:
// CREATE INDEX idx_follow_up_action_plan ON strategic_action_plan_follow_up (action_plan_id);
// CREATE INDEX idx_follow_up_date ON strategic_action_plan_follow_up (follow_up_date);
// CREATE INDEX idx_follow_up_status ON strategic_action_plan_follow_up (execution_status);
// CREATE INDEX idx_follow_up_verifier ON strategic_action_plan_follow_up (verified_by);

export type ActionPlanFollowUpRow = typeof actionPlanFollowUpTable.$inferSelect;
export type ActionPlanFollowUpInsert = typeof actionPlanFollowUpTable.$inferInsert;
