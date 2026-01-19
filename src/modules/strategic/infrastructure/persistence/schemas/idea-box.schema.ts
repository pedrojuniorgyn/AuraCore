/**
 * Schema: Idea Box (Banco de Ideias)
 * Captura e conversão de ideias para melhoria contínua
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable } from 'drizzle-orm/mssql-core';

export const ideaBoxTable = mssqlTable('strategic_idea_box', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  code: varchar('code', { length: 20 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  
  // Tipo da fonte: SUGGESTION | COMPLAINT | OBSERVATION | BENCHMARK | AUDIT | CLIENT_FEEDBACK
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }),
  
  // Quem submeteu
  submittedBy: varchar('submitted_by', { length: 36 }).notNull(),
  submittedByName: varchar('submitted_by_name', { length: 100 }),
  department: varchar('department', { length: 100 }),
  
  // Priorização (Matriz Eisenhower)
  urgency: varchar('urgency', { length: 10 }).notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH
  importance: varchar('importance', { length: 10 }).notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH
  
  // Estimativas
  estimatedImpact: varchar('estimated_impact', { length: 20 }), // LOW | MEDIUM | HIGH | VERY_HIGH
  estimatedCost: decimal('estimated_cost', { precision: 18, scale: 2 }), // (SCHEMA-007)
  estimatedCostCurrency: varchar('estimated_cost_currency', { length: 3 }).default('BRL'),
  estimatedBenefit: decimal('estimated_benefit', { precision: 18, scale: 2 }), // (SCHEMA-007)
  estimatedBenefitCurrency: varchar('estimated_benefit_currency', { length: 3 }).default('BRL'),
  
  // Status do fluxo: SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | CONVERTED | ARCHIVED
  status: varchar('status', { length: 20 }).notNull().default('SUBMITTED'),
  
  // Revisão
  reviewedBy: varchar('reviewed_by', { length: 36 }),
  reviewedAt: datetime2('reviewed_at'),
  reviewNotes: text('review_notes'),
  
  // Conversão (para onde a ideia foi convertida)
  convertedTo: varchar('converted_to', { length: 50 }), // ACTION_PLAN | MEETING_ITEM | SWOT_ITEM | PROJECT | GOAL | KPI
  convertedEntityId: varchar('converted_entity_id', { length: 36 }),
  convertedAt: datetime2('converted_at'),
  
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
});

// Índices serão criados via migration:
// CREATE INDEX idx_idea_box_tenant ON strategic_idea_box (organization_id, branch_id);
// CREATE INDEX idx_idea_box_code ON strategic_idea_box (organization_id, branch_id, code);
// CREATE INDEX idx_idea_box_status ON strategic_idea_box (status);
// CREATE INDEX idx_idea_box_submitter ON strategic_idea_box (submitted_by);
// CREATE INDEX idx_idea_box_source ON strategic_idea_box (source_type);

export type IdeaBoxRow = typeof ideaBoxTable.$inferSelect;
export type IdeaBoxInsert = typeof ideaBoxTable.$inferInsert;
