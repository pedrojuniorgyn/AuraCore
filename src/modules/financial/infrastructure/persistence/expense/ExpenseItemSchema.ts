import { varchar, decimal, datetime, bit } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: expense_items
 * 
 * Persistence model para ExpenseItem
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Campos opcionais = .nullable()
 * 3. Money com 2 campos: decimal (amount) + varchar(3) (currency)
 */
export const expenseItems = mssqlTable('expense_items', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  expenseReportId: varchar('expense_report_id', { length: 36 }).notNull(),
  
  // Dados da despesa
  categoria: varchar('categoria', { length: 30 }).notNull(),
  data: datetime('data').notNull(),
  descricao: varchar('descricao', { length: 500 }).notNull(),
  
  // Valor (Money com 2 campos)
  valorAmount: decimal('valor_amount', { precision: 15, scale: 2 }).notNull(),
  valorCurrency: varchar('valor_currency', { length: 3 }).notNull().default('BRL'),
  
  // Comprovante (nullable)
  comprovanteType: varchar('comprovante_type', { length: 20 }),
  comprovanteNumero: varchar('comprovante_numero', { length: 50 }),
  comprovanteUrl: varchar('comprovante_url', { length: 500 }),
  
  // Validação de política
  dentroPolitica: bit('dentro_politica').notNull(),
  motivoViolacao: varchar('motivo_violacao', { length: 500 }),
});

/**
 * Índices recomendados para performance:
 * 
 * CREATE INDEX idx_expense_items_report 
 *   ON expense_items(expense_report_id);
 * 
 * CREATE INDEX idx_expense_items_categoria 
 *   ON expense_items(categoria, expense_report_id);
 * 
 * CREATE INDEX idx_expense_items_data 
 *   ON expense_items(data, expense_report_id);
 */

