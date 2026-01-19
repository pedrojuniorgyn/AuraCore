/**
 * Schema: Strategic Goal
 * Metas estratégicas com cascateamento CEO → DIRECTOR → MANAGER → TEAM
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0021
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';
import { bscPerspectiveTable } from './bsc-perspective.schema';

export const strategicGoalTable = mssqlTable('strategic_goal', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  perspectiveId: varchar('perspective_id', { length: 36 })
    .notNull()
    .references(() => bscPerspectiveTable.id),
  parentGoalId: varchar('parent_goal_id', { length: 36 }), // Self-reference para cascateamento
  
  code: varchar('code', { length: 20 }).notNull(),
  description: text('description').notNull(),
  cascadeLevel: varchar('cascade_level', { length: 20 }).notNull(), // CEO|DIRECTOR|MANAGER|TEAM
  
  targetValue: decimal('target_value', { precision: 18, scale: 4 }).notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }).notNull().default('0'),
  baselineValue: decimal('baseline_value', { precision: 18, scale: 4 }), // Valor inicial de referência
  unit: varchar('unit', { length: 20 }).notNull(),
  polarity: varchar('polarity', { length: 10 }).notNull().default('UP'), // UP = maior é melhor, DOWN = menor é melhor
  weight: decimal('weight', { precision: 5, scale: 2 }).notNull(),
  
  ownerUserId: varchar('owner_user_id', { length: 36 }).notNull(),
  ownerBranchId: int('owner_branch_id').notNull(),
  
  startDate: datetime2('start_date').notNull(),
  dueDate: datetime2('due_date').notNull(),
  
  // NOT_STARTED | IN_PROGRESS | ON_TRACK | AT_RISK | DELAYED | ACHIEVED | CANCELLED
  status: varchar('status', { length: 20 }).notNull().default('NOT_STARTED'),
  
  // Posição no mapa estratégico (ReactFlow)
  mapPositionX: int('map_position_x'),
  mapPositionY: int('map_position_y'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_strategic_goal_tenant ON strategic_goal (organization_id, branch_id);
// CREATE INDEX idx_strategic_goal_perspective ON strategic_goal (perspective_id);
// CREATE INDEX idx_strategic_goal_parent ON strategic_goal (parent_goal_id);
// CREATE INDEX idx_strategic_goal_cascade ON strategic_goal (cascade_level);
// CREATE INDEX idx_strategic_goal_status ON strategic_goal (status);
// CREATE INDEX idx_strategic_goal_owner ON strategic_goal (owner_user_id);

export type StrategicGoalRow = typeof strategicGoalTable.$inferSelect;
export type StrategicGoalInsert = typeof strategicGoalTable.$inferInsert;
