/**
 * Schema: Goal Cascade
 * Relações N:N de causa-efeito entre metas estratégicas
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0021
 */
import { sql } from 'drizzle-orm';
import { varchar, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { strategicGoalTable } from './strategic-goal.schema';

export const goalCascadeTable = mssqlTable('strategic_goal_cascade', {
  id: varchar('id', { length: 36 }).primaryKey(),
  
  // Meta causa (origem)
  causeGoalId: varchar('cause_goal_id', { length: 36 })
    .notNull()
    .references(() => strategicGoalTable.id),
  
  // Meta efeito (destino)
  effectGoalId: varchar('effect_goal_id', { length: 36 })
    .notNull()
    .references(() => strategicGoalTable.id),
  
  // Peso da contribuição (0-100%)
  contributionWeight: decimal('contribution_weight', { precision: 5, scale: 2 }).notNull().default('100.00'),
  
  // Descrição da relação causa-efeito
  description: varchar('description', { length: 500 }),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
});

// Índices serão criados via migration:
// CREATE INDEX idx_goal_cascade_cause ON strategic_goal_cascade (cause_goal_id);
// CREATE INDEX idx_goal_cascade_effect ON strategic_goal_cascade (effect_goal_id);
// CREATE UNIQUE INDEX idx_goal_cascade_unique ON strategic_goal_cascade (cause_goal_id, effect_goal_id);

export type GoalCascadeRow = typeof goalCascadeTable.$inferSelect;
export type GoalCascadeInsert = typeof goalCascadeTable.$inferInsert;
