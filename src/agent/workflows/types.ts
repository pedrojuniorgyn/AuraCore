/**
 * @module agent/workflows/types
 * @description Tipos e interfaces para workflows LangGraph
 */

/**
 * Tipo de documento fiscal
 */
export type FiscalDocumentType = 'nfe' | 'cte' | 'nfse' | 'mdfe';

/**
 * Fonte do documento
 */
export type DocumentSource = 'email' | 'drive' | 'upload';

/**
 * Status do workflow
 */
export type WorkflowStatus = 
  | 'pending'
  | 'fetching'
  | 'extracting'
  | 'validating'
  | 'calculating'
  | 'saving'
  | 'completed'
  | 'failed';

/**
 * Dados extraídos de documento fiscal
 */
export interface ExtractedFiscalData {
  /** Chave de acesso (44 dígitos) */
  accessKey: string;
  /** Número do documento */
  documentNumber: string;
  /** Série */
  series: string;
  /** Data de emissão */
  issueDate: Date;
  /** CNPJ do emitente */
  issuerCnpj: string;
  /** Nome do emitente */
  issuerName: string;
  /** CNPJ do destinatário */
  recipientCnpj: string;
  /** Nome do destinatário */
  recipientName: string;
  /** Valor total */
  totalValue: number;
  /** Valor dos produtos/serviços */
  productsValue: number;
  /** CFOP principal */
  cfop: string;
  /** Natureza da operação */
  operationType: string;
  /** Itens do documento */
  items: FiscalDocumentItem[];
  /** Impostos já calculados no documento */
  taxes: DocumentTaxes;
  /** Dados brutos do XML */
  rawXml?: string;
}

/**
 * Item de documento fiscal
 */
export interface FiscalDocumentItem {
  /** Código do produto */
  productCode: string;
  /** Descrição */
  description: string;
  /** NCM */
  ncm: string;
  /** CFOP do item */
  cfop: string;
  /** Quantidade */
  quantity: number;
  /** Unidade */
  unit: string;
  /** Valor unitário */
  unitValue: number;
  /** Valor total */
  totalValue: number;
  /** Valor do ICMS */
  icmsValue: number;
  /** Valor do IPI */
  ipiValue?: number;
  /** Valor do PIS */
  pisValue: number;
  /** Valor do COFINS */
  cofinsValue: number;
}

/**
 * Impostos do documento
 */
export interface DocumentTaxes {
  /** Base de cálculo ICMS */
  icmsBase: number;
  /** Valor ICMS */
  icmsValue: number;
  /** Base de cálculo ST */
  icmsStBase?: number;
  /** Valor ICMS ST */
  icmsStValue?: number;
  /** Valor IPI */
  ipiValue?: number;
  /** Valor PIS */
  pisValue: number;
  /** Valor COFINS */
  cofinsValue: number;
  /** Valor ISS (para NFS-e) */
  issValue?: number;
  /** Total de impostos */
  totalTaxes: number;
}

/**
 * Resultado de validação
 */
export interface ValidationResult {
  /** Validação passou? */
  isValid: boolean;
  /** Erros encontrados */
  errors: ValidationError[];
  /** Avisos (não bloqueantes) */
  warnings: ValidationWarning[];
}

/**
 * Erro de validação
 */
export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error';
}

/**
 * Aviso de validação
 */
export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: 'warning';
}

/**
 * Resultado de cálculo de impostos
 */
export interface TaxCalculationResult {
  /** Impostos calculados */
  taxes: DocumentTaxes;
  /** CFOP sugerido */
  suggestedCfop: string;
  /** Natureza da operação sugerida */
  suggestedOperationType: string;
  /** Observações fiscais */
  observations: string[];
  /** Diferença em relação aos impostos originais */
  difference?: {
    icms: number;
    pis: number;
    cofins: number;
    total: number;
  };
}

/**
 * Estado do workflow de importação fiscal
 */
export interface FiscalImportState {
  // === Input ===
  /** Fonte do documento */
  source: DocumentSource;
  /** Identificador (messageId, fileId, base64) */
  identifier: string;
  /** Tipo de documento fiscal */
  documentType: FiscalDocumentType;
  
  // === Processamento ===
  /** Documento raw (Buffer) */
  rawDocument?: Buffer;
  /** Mime type do documento */
  mimeType?: string;
  /** Dados extraídos */
  extractedData?: ExtractedFiscalData;
  /** Resultado da validação */
  validationResult?: ValidationResult;
  /** Resultado do cálculo de impostos */
  calculatedTaxes?: TaxCalculationResult;
  
  // === Output ===
  /** ID do documento fiscal no AuraCore */
  fiscalDocumentId?: string;
  /** Status atual */
  status: WorkflowStatus;
  /** Erros acumulados */
  errors: string[];
  /** Logs de execução */
  logs: string[];
  
  // === Contexto ===
  /** ID da organização */
  organizationId: number;
  /** ID da filial */
  branchId: number;
  /** ID do usuário */
  userId: string;
  /** Timestamp de início */
  startedAt: Date;
  /** Timestamp de fim */
  completedAt?: Date;
}

/**
 * Resultado final do workflow
 */
export interface FiscalImportResult {
  success: boolean;
  fiscalDocumentId?: string;
  summary?: {
    documentNumber: string;
    issuerName: string;
    totalValue: number;
    totalTaxes: number;
  };
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
}

/**
 * Configuração do workflow
 */
export interface FiscalImportConfig {
  /** Validar apenas sem importar */
  validateOnly?: boolean;
  /** Recalcular impostos */
  recalculateTaxes?: boolean;
  /** Ignorar avisos */
  ignoreWarnings?: boolean;
  /** Timeout em ms */
  timeoutMs?: number;
}
