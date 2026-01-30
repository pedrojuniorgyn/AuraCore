/**
 * Schema: Action Plan (5W2H + PDCA)
 * Planos de ação com reproposição e ciclo PDCA
 * 
 * @module strategic/infrastructure/persistence/schemas
 * @see ADR-0020, ADR-0022
 */
import { sql } from 'drizzle-orm';
import { int, varchar, text, decimal, datetime2, mssqlTable, index } from 'drizzle-orm/mssql-core';
import { strategicGoalTable } from './strategic-goal.schema';

export const actionPlanTable = mssqlTable('strategic_action_plan', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  goalId: varchar('goal_id', { length: 36 })
    .references(() => strategicGoalTable.id),
  
  code: varchar('code', { length: 20 }).notNull(),
  
  // 5W2H
  what: text('what').notNull(), // O que será feito
  why: text('why').notNull(), // Por que será feito
  whereLocation: varchar('where_location', { length: 200 }).notNull(), // Onde será feito
  whenStart: datetime2('when_start').notNull(), // Quando inicia
  whenEnd: datetime2('when_end').notNull(), // Quando termina
  who: varchar('who', { length: 100 }).notNull(), // Nome do responsável
  whoUserId: varchar('who_user_id', { length: 36 }).notNull(), // ID do usuário responsável
  how: text('how').notNull(), // Como será feito
  howMuchAmount: decimal('how_much_amount', { precision: 18, scale: 2 }), // Quanto custa (SCHEMA-007)
  howMuchCurrency: varchar('how_much_currency', { length: 3 }).default('BRL'), // Moeda (SCHEMA-007)
  
  // PDCA
  pdcaCycle: varchar('pdca_cycle', { length: 10 }).notNull().default('PLAN'), // PLAN | DO | CHECK | ACT
  completionPercent: decimal('completion_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  
  // Reproposição
  parentActionPlanId: varchar('parent_action_plan_id', { length: 36 }),
  repropositionNumber: int('reproposition_number').notNull().default(0),
  repropositionReason: text('reproposition_reason'),
  
  // Prioridade
  priority: varchar('priority', { length: 10 }).notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH | CRITICAL
  
  // Status: DRAFT | PENDING | IN_PROGRESS | COMPLETED | CANCELLED | BLOCKED
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  // Evidências
  evidenceUrls: text('evidence_urls'), // JSON array
  
  // Próximo follow-up agendado
  nextFollowUpDate: datetime2('next_follow_up_date'),
  
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime2('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime2('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime2('deleted_at'),
}, (table) => ([
  // SCHEMA-003: Índice composto obrigatório para multi-tenancy
  index('idx_action_plan_tenant').on(table.organizationId, table.branchId),
  // Índices adicionais
  index('idx_action_plan_goal').on(table.goalId),
  index('idx_action_plan_pdca').on(table.pdcaCycle),
  index('idx_action_plan_status').on(table.status),
  index('idx_action_plan_parent').on(table.parentActionPlanId),
  index('idx_action_plan_who').on(table.whoUserId),
  index('idx_action_plan_follow_up').on(table.nextFollowUpDate),

  // Índices temporais para queries de período (YTD, QTD, MTD)
  index('idx_action_plan_when_start').on(table.whenStart),
  index('idx_action_plan_when_end').on(table.whenEnd),
  index('idx_action_plan_period').on(table.organizationId, table.branchId, table.whenStart, table.whenEnd),

  // Índice para queries de planos atrasados
  index('idx_action_plan_overdue').on(table.organizationId, table.branchId, table.whenEnd, table.status),
]));

export type ActionPlanRow = typeof actionPlanTable.$inferSelect;
export type ActionPlanInsert = typeof actionPlanTable.$inferInsert;
