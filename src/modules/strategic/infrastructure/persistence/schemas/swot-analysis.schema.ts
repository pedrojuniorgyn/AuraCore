/**
 * Schema: SWOT Analysis
 * Análise estratégica Strengths, Weaknesses, Opportunities, Threats
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { strategyTable } from './strategy.schema';

export const swotAnalysisTable = mssqlTable('strategic_swot_analysis', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  strategyId: varchar('strategy_id', { length: 36 })
    .references(() => strategyTable.id),
  
  // SWOT Quadrant: STRENGTH | WEAKNESS | OPPORTUNITY | THREAT
  quadrant: varchar('quadrant', { length: 15 }).notNull(),
  
  // Item
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // Priorização
  impactScore: decimal('impact_score', { precision: 3, scale: 1 }).notNull().default('3'), // 1-5
  probabilityScore: decimal('probability_score', { precision: 3, scale: 1 }).notNull().default('3'), // 1-5
  priorityScore: decimal('priority_score', { precision: 5, scale: 2 }), // Calculado: impact * probability
  
  // Categoria
  category: varchar('category', { length: 50 }), // MARKET | TECHNOLOGY | FINANCIAL | OPERATIONAL | PEOPLE | etc
  
  // Conversão para ação
  convertedToActionPlanId: varchar('converted_to_action_plan_id', { length: 36 }),
  convertedToGoalId: varchar('converted_to_goal_id', { length: 36 }),
  
  // Status: IDENTIFIED | ANALYZING | ACTION_DEFINED | MONITORING | RESOLVED
  status: varchar('status', { length: 20 }).notNull().default('IDENTIFIED'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_swot_tenant ON strategic_swot_analysis (organization_id, branch_id);
// CREATE INDEX idx_swot_strategy ON strategic_swot_analysis (strategy_id);
// CREATE INDEX idx_swot_quadrant ON strategic_swot_analysis (quadrant);
// CREATE INDEX idx_swot_priority ON strategic_swot_analysis (priority_score);
// CREATE INDEX idx_swot_status ON strategic_swot_analysis (status);

export type SwotAnalysisRow = typeof swotAnalysisTable.$inferSelect;
export type SwotAnalysisInsert = typeof swotAnalysisTable.$inferInsert;
