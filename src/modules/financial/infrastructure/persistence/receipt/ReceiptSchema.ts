import { varchar, int, decimal, datetime, text } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: receipts
 * 
 * Persistence model para Receipt Aggregate Root
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Campos opcionais = .nullable()
 * 3. Money com 2 campos: decimal (amount) + varchar(3) (currency)
 * 4. Multi-tenancy: organizationId + branchId
 * 5. Soft delete: deletedAt
 */
export const receipts = mssqlTable('receipts', {
  // Identificação
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Numeração
  tipo: varchar('tipo', { length: 20 }).notNull(),
  numero: int('numero').notNull(),
  serie: varchar('serie', { length: 10 }).notNull(),
  
  // Pagador
  pagadorNome: varchar('pagador_nome', { length: 255 }).notNull(),
  pagadorDocumento: varchar('pagador_documento', { length: 14 }).notNull(),
  pagadorTipoDocumento: varchar('pagador_tipo_documento', { length: 4 }).notNull(),
  pagadorEnderecoLogradouro: varchar('pagador_endereco_logradouro', { length: 255 }),
  pagadorEnderecoNumero: varchar('pagador_endereco_numero', { length: 20 }),
  pagadorEnderecoComplemento: varchar('pagador_endereco_complemento', { length: 100 }),
  pagadorEnderecoBairro: varchar('pagador_endereco_bairro', { length: 100 }),
  pagadorEnderecoCidade: varchar('pagador_endereco_cidade', { length: 100 }),
  pagadorEnderecoEstado: varchar('pagador_endereco_estado', { length: 2 }),
  pagadorEnderecoCep: varchar('pagador_endereco_cep', { length: 8 }),
  
  // Recebedor
  recebedorNome: varchar('recebedor_nome', { length: 255 }).notNull(),
  recebedorDocumento: varchar('recebedor_documento', { length: 14 }).notNull(),
  recebedorTipoDocumento: varchar('recebedor_tipo_documento', { length: 4 }).notNull(),
  recebedorEnderecoLogradouro: varchar('recebedor_endereco_logradouro', { length: 255 }),
  recebedorEnderecoNumero: varchar('recebedor_endereco_numero', { length: 20 }),
  recebedorEnderecoComplemento: varchar('recebedor_endereco_complemento', { length: 100 }),
  recebedorEnderecoBairro: varchar('recebedor_endereco_bairro', { length: 100 }),
  recebedorEnderecoCidade: varchar('recebedor_endereco_cidade', { length: 100 }),
  recebedorEnderecoEstado: varchar('recebedor_endereco_estado', { length: 2 }),
  recebedorEnderecoCep: varchar('recebedor_endereco_cep', { length: 8 }),
  
  // Valores (Money com 2 campos)
  valorAmount: decimal('valor_amount', { precision: 15, scale: 2 }).notNull(),
  valorCurrency: varchar('valor_currency', { length: 3 }).notNull().default('BRL'),
  valorPorExtenso: text('valor_por_extenso').notNull(),
  
  // Detalhes
  descricao: text('descricao').notNull(),
  formaPagamento: varchar('forma_pagamento', { length: 20 }).notNull(),
  dataRecebimento: datetime('data_recebimento').notNull(),
  localRecebimento: varchar('local_recebimento', { length: 255 }),
  
  // Vinculações opcionais
  financialTransactionId: varchar('financial_transaction_id', { length: 36 }),
  payableId: varchar('payable_id', { length: 36 }),
  receivableId: varchar('receivable_id', { length: 36 }),
  tripId: varchar('trip_id', { length: 36 }),
  expenseReportId: varchar('expense_report_id', { length: 36 }),
  
  // Emissão
  emitidoPor: varchar('emitido_por', { length: 255 }).notNull(),
  emitidoEm: datetime('emitido_em').notNull(),
  
  // Cancelamento
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  canceladoEm: datetime('cancelado_em'),
  canceladoPor: varchar('cancelado_por', { length: 255 }),
  motivoCancelamento: text('motivo_cancelamento'),
  
  // Auditoria
  createdAt: datetime('created_at').notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  updatedAt: datetime('updated_at').notNull(),
  updatedBy: varchar('updated_by', { length: 255 }).notNull(),
  deletedAt: datetime('deleted_at'),
});

/**
 * Índices recomendados para performance:
 * 
 * CREATE UNIQUE INDEX idx_receipts_numero 
 *   ON receipts(organization_id, branch_id, tipo, serie, numero)
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_receipts_organization 
 *   ON receipts(organization_id, branch_id, deleted_at);
 * 
 * CREATE INDEX idx_receipts_status 
 *   ON receipts(organization_id, branch_id, status)
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_receipts_data_recebimento 
 *   ON receipts(organization_id, branch_id, data_recebimento)
 *   WHERE deleted_at IS NULL;
 * 
 * CREATE INDEX idx_receipts_emitido_por 
 *   ON receipts(organization_id, branch_id, emitido_por)
 *   WHERE deleted_at IS NULL;
 */

