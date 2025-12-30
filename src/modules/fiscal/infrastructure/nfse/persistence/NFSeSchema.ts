import { sql } from 'drizzle-orm';
import { char, varchar, decimal, int, datetime, text, mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Drizzle Schema: nfse_documents
 * 
 * Persistence model para NFSeDocument
 * 
 * REGRAS OBRIGATORIAS (infrastructure-layer.json):
 * 1. Schema DEVE espelhar Domain Model COMPLETO
 * 2. Money = 2 campos (amount + currency)
 * 3. Campos opcionais = .nullable()
 * 4. Multi-tenancy: organizationId + branchId (obrigatórios)
 * 5. Soft delete: deletedAt
 * 
 * Relacionamentos:
 * - organizationId: FK para organizations
 * - branchId: FK para branches
 */
export const nfseDocuments = mssqlTable('nfse_documents', {
  // Identificação
  id: char('id', { length: 36 }).primaryKey(),
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // DRAFT, PENDING, AUTHORIZED, CANCELLED
  
  // Numeração
  numero: varchar('numero', { length: 20 }).notNull(),
  serie: varchar('serie', { length: 5 }),
  dataEmissao: datetime('data_emissao').notNull(),
  competencia: datetime('competencia').notNull(),
  
  // Prestador
  prestadorCnpj: varchar('prestador_cnpj', { length: 14 }).notNull(),
  prestadorRazaoSocial: varchar('prestador_razao_social', { length: 255 }).notNull(),
  prestadorNomeFantasia: varchar('prestador_nome_fantasia', { length: 255 }),
  prestadorInscricaoMunicipal: varchar('prestador_inscricao_municipal', { length: 20 }).notNull(),
  prestadorLogradouro: varchar('prestador_logradouro', { length: 255 }).notNull(),
  prestadorNumero: varchar('prestador_numero', { length: 10 }).notNull(),
  prestadorComplemento: varchar('prestador_complemento', { length: 100 }),
  prestadorBairro: varchar('prestador_bairro', { length: 100 }).notNull(),
  prestadorCodigoMunicipio: varchar('prestador_codigo_municipio', { length: 7 }).notNull(),
  prestadorUf: varchar('prestador_uf', { length: 2 }).notNull(),
  prestadorCep: varchar('prestador_cep', { length: 8 }).notNull(),
  prestadorTelefone: varchar('prestador_telefone', { length: 20 }),
  prestadorEmail: varchar('prestador_email', { length: 255 }),
  
  // Tomador
  tomadorCpfCnpj: varchar('tomador_cpf_cnpj', { length: 14 }).notNull(),
  tomadorRazaoSocial: varchar('tomador_razao_social', { length: 255 }).notNull(),
  tomadorLogradouro: varchar('tomador_logradouro', { length: 255 }),
  tomadorNumero: varchar('tomador_numero', { length: 10 }),
  tomadorComplemento: varchar('tomador_complemento', { length: 100 }),
  tomadorBairro: varchar('tomador_bairro', { length: 100 }),
  tomadorCodigoMunicipio: varchar('tomador_codigo_municipio', { length: 7 }),
  tomadorUf: varchar('tomador_uf', { length: 2 }),
  tomadorCep: varchar('tomador_cep', { length: 8 }),
  tomadorTelefone: varchar('tomador_telefone', { length: 20 }),
  tomadorEmail: varchar('tomador_email', { length: 255 }),
  
  // Intermediário (opcional)
  intermediarioCpfCnpj: varchar('intermediario_cpf_cnpj', { length: 14 }),
  intermediarioRazaoSocial: varchar('intermediario_razao_social', { length: 255 }),
  
  // Serviço
  servicoCodigoServico: varchar('servico_codigo_servico', { length: 10 }).notNull(),
  servicoCodigoCnae: varchar('servico_codigo_cnae', { length: 7 }).notNull(),
  servicoCodigoTributacaoMunicipio: varchar('servico_codigo_tributacao_municipio', { length: 20 }),
  servicoDiscriminacao: text('servico_discriminacao').notNull(),
  servicoValorServicos: decimal('servico_valor_servicos', { precision: 18, scale: 2 }).notNull(),
  servicoValorServicosCurrency: varchar('servico_valor_servicos_currency', { length: 3 }).notNull().default('BRL'),
  servicoValorDeducoes: decimal('servico_valor_deducoes', { precision: 18, scale: 2 }),
  servicoValorDeducoesCurrency: varchar('servico_valor_deducoes_currency', { length: 3 }),
  servicoValorPis: decimal('servico_valor_pis', { precision: 18, scale: 2 }),
  servicoValorPisCurrency: varchar('servico_valor_pis_currency', { length: 3 }),
  servicoValorCofins: decimal('servico_valor_cofins', { precision: 18, scale: 2 }),
  servicoValorCofinsCurrency: varchar('servico_valor_cofins_currency', { length: 3 }),
  servicoValorInss: decimal('servico_valor_inss', { precision: 18, scale: 2 }),
  servicoValorInssCurrency: varchar('servico_valor_inss_currency', { length: 3 }),
  servicoValorIr: decimal('servico_valor_ir', { precision: 18, scale: 2 }),
  servicoValorIrCurrency: varchar('servico_valor_ir_currency', { length: 3 }),
  servicoValorCsll: decimal('servico_valor_csll', { precision: 18, scale: 2 }),
  servicoValorCsllCurrency: varchar('servico_valor_csll_currency', { length: 3 }),
  servicoOutrasRetencoes: decimal('servico_outras_retencoes', { precision: 18, scale: 2 }),
  servicoOutrasRetencoesCurrency: varchar('servico_outras_retencoes_currency', { length: 3 }),
  servicoDescontoCondicionado: decimal('servico_desconto_condicionado', { precision: 18, scale: 2 }),
  servicoDescontoCondicionadoCurrency: varchar('servico_desconto_condicionado_currency', { length: 3 }),
  servicoDescontoIncondicionado: decimal('servico_desconto_incondicionado', { precision: 18, scale: 2 }),
  servicoDescontoIncondicionadoCurrency: varchar('servico_desconto_incondicionado_currency', { length: 3 }),
  
  // ISS
  issRetido: int('iss_retido').notNull(), // 0=false, 1=true
  issValorIss: decimal('iss_valor_iss', { precision: 18, scale: 2 }).notNull(),
  issValorIssCurrency: varchar('iss_valor_iss_currency', { length: 3 }).notNull().default('BRL'),
  issAliquota: decimal('iss_aliquota', { precision: 5, scale: 2 }).notNull(),
  issBaseCalculo: decimal('iss_base_calculo', { precision: 18, scale: 2 }).notNull(),
  issBaseCalculoCurrency: varchar('iss_base_calculo_currency', { length: 3 }).notNull().default('BRL'),
  issValorIssRetido: decimal('iss_valor_iss_retido', { precision: 18, scale: 2 }),
  issValorIssRetidoCurrency: varchar('iss_valor_iss_retido_currency', { length: 3 }),
  issCodigoMunicipioIncidencia: varchar('iss_codigo_municipio_incidencia', { length: 7 }),
  
  // Valores totais
  valorLiquido: decimal('valor_liquido', { precision: 18, scale: 2 }).notNull(),
  valorLiquidoCurrency: varchar('valor_liquido_currency', { length: 3 }).notNull().default('BRL'),
  
  // Reforma Tributária
  taxRegime: varchar('tax_regime', { length: 20 }).notNull().default('CURRENT'),
  // ibsCbsGroup será armazenado em tabela separada (fiscal_document_ibs_cbs)
  
  // Observações
  observacoes: text('observacoes'),
  
  // Controle (após autorização)
  numeroNfse: varchar('numero_nfse', { length: 20 }),
  codigoVerificacao: varchar('codigo_verificacao', { length: 20 }),
  protocoloEnvio: varchar('protocolo_envio', { length: 50 }),
  protocoloCancelamento: varchar('protocolo_cancelamento', { length: 50 }),
  motivoCancelamento: text('motivo_cancelamento'),
  authorizedAt: datetime('authorized_at'),
  cancelledAt: datetime('cancelled_at'),
  
  // Versioning
  version: int('version').notNull().default(1),
  
  // Audit
  createdAt: datetime('created_at').notNull().default(sql`GETDATE()`),
  updatedAt: datetime('updated_at').notNull().default(sql`GETDATE()`),
  deletedAt: datetime('deleted_at'), // Soft delete
});

/**
 * Índices para performance e multi-tenancy
 */
// CREATE INDEX idx_nfse_org_branch ON nfse_documents(organization_id, branch_id, deleted_at);
// CREATE INDEX idx_nfse_numero ON nfse_documents(numero, organization_id, branch_id);
// CREATE INDEX idx_nfse_prestador ON nfse_documents(prestador_cnpj, organization_id);
// CREATE INDEX idx_nfse_tomador ON nfse_documents(tomador_cpf_cnpj, organization_id);
// CREATE INDEX idx_nfse_status ON nfse_documents(status, organization_id, branch_id);
// CREATE INDEX idx_nfse_data_emissao ON nfse_documents(data_emissao, organization_id, branch_id);

