import { sql } from 'drizzle-orm';
import { varchar, int, decimal, datetime, bit } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: expense_reports
 * 
 * Persistence model para ExpenseReport
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Campos opcionais = .nullable()
 * 3. Multi-tenancy: organizationId + branchId (obrigatórios)
 * 4. Soft delete: deletedAt
 * 5. Money com 2 campos: decimal (amount) + varchar(3) (currency)
 */
export const expenseReports = mssqlTable('expense_reports', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Colaborador
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  employeeName: varchar('employee_name', { length: 200 }).notNull(),
  costCenterId: varchar('cost_center_id', { length: 36 }).notNull(),
  
  // Período da atividade
  periodoInicio: datetime('periodo_inicio').notNull(),
  periodoFim: datetime('periodo_fim').notNull(),
  motivo: varchar('motivo', { length: 500 }).notNull(),
  projeto: varchar('projeto', { length: 100 }),
  
  // Adiantamento (nullable group - todos ou nenhum)
  advanceValorSolicitadoAmount: decimal('advance_valor_solicitado_amount', { precision: 15, scale: 2 }),
  advanceValorSolicitadoCurrency: varchar('advance_valor_solicitado_currency', { length: 3 }),
  advanceDataSolicitacao: datetime('advance_data_solicitacao'),
  advanceStatusAprovacao: varchar('advance_status_aprovacao', { length: 20 }),
  advanceValorAprovadoAmount: decimal('advance_valor_aprovado_amount', { precision: 15, scale: 2 }),
  advanceValorAprovadoCurrency: varchar('advance_valor_aprovado_currency', { length: 3 }),
  advanceDataLiberacao: datetime('advance_data_liberacao'),
  advanceAprovadorId: varchar('advance_aprovador_id', { length: 36 }),
  
  // Totais (Money com 2 campos)
  totalDespesasAmount: decimal('total_despesas_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalDespesasCurrency: varchar('total_despesas_currency', { length: 3 }).notNull().default('BRL'),
  saldoAmount: decimal('saldo_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  saldoCurrency: varchar('saldo_currency', { length: 3 }).notNull().default('BRL'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  
  // Fluxo de aprovação (nullable)
  submittedAt: datetime('submitted_at'),
  reviewerId: varchar('reviewer_id', { length: 36 }),
  reviewedAt: datetime('reviewed_at'),
  reviewNotes: varchar('review_notes', { length: 2000 }),
  
  // Integração Financeiro (nullable)
  payableId: varchar('payable_id', { length: 36 }),
  
  // Auditoria
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
  updatedBy: varchar('updated_by', { length: 36 }).notNull(),
  deletedAt: datetime('deleted_at'), // Soft delete
});

/**
 * Índices recomendados para performance e multi-tenancy:
 * 
 * CREATE INDEX idx_expense_reports_org_status 
 *   ON expense_reports(organization_id, branch_id, status, created_at) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_expense_reports_employee 
 *   ON expense_reports(employee_id, organization_id, branch_id) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_expense_reports_cost_center 
 *   ON expense_reports(cost_center_id, organization_id) 
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_expense_reports_payable 
 *   ON expense_reports(payable_id) 
 *   WHERE payable_id IS NOT NULL AND deleted_at IS NULL;
 * 
 * CREATE INDEX idx_expense_reports_periodo 
 *   ON expense_reports(organization_id, branch_id, periodo_inicio, periodo_fim) 
 *   WHERE deleted_at IS NULL;
 */

