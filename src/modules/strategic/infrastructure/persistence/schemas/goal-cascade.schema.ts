/**
 * Schema: Goal Cascade
 * Relações N:N de causa-efeito entre metas estratégicas
 * 
 * Multi-tenancy: organizationId + branchId (OBRIGATÓRIO - S1.2)
 * Soft delete: N/A (relação lógica, não deletável)
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0021
 * @see Sprint Blindagem S1.2
 */
import { sql } from 'drizzle-orm';
import { int, varchar, decimal, datetime2, index, mssqlTable } from 'drizzle-orm/mssql-core';
import { strategicGoalTable } from './strategic-goal.schema';

export const goalCascadeTable = mssqlTable(
  'strategic_goal_cascade',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    
    // Multi-tenancy (OBRIGATÓRIO - S1.2)
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
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
    
    // Auditoria
    createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  },
  (table) => [
    // ✅ SCHEMA-003: Índice composto OBRIGATÓRIO para multi-tenancy (S1.2)
    index('idx_goal_cascade_tenant').on(table.organizationId, table.branchId),
    // Índices para hierarquia
    index('idx_goal_cascade_cause').on(table.causeGoalId),
    index('idx_goal_cascade_effect').on(table.effectGoalId),
  ]
);

export type GoalCascadeRow = typeof goalCascadeTable.$inferSelect;
export type GoalCascadeInsert = typeof goalCascadeTable.$inferInsert;
