/**
 * Process Document Contract
 * =========================
 *
 * Definição de schemas e tipos para o MCP Tool process_document.
 * Permite processamento de PDFs (DANFe, DACTe, Contratos, Extratos) via Docling.
 *
 * @module mcp-server/contracts/process-document
 * @see E-Agent-Fase-D7
 */

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Tipos de documento suportados pelo processador.
 */
export type DocumentType =
  | 'danfe'
  | 'dacte'
  | 'freight_contract'
  | 'bank_statement'
  | 'generic';

/**
 * Opções de processamento.
 */
export interface ProcessDocumentOptions {
  /** Idioma do documento (default: pt-BR) */
  language?: string;

  /** Habilitar OCR (default: true) */
  ocr_enabled?: boolean;
}

/**
 * Input do tool process_document.
 */
export interface ProcessDocumentInput {
  /** Tipo de documento a ser processado */
  document_type: DocumentType;

  /** Caminho do arquivo local */
  file_path?: string;

  /** Conteúdo do arquivo em base64 */
  file_base64?: string;

  /** Nome do arquivo (para identificar extensão) */
  file_name: string;

  /** Extrair tabelas (default: true) */
  extract_tables?: boolean;

  /** Extrair texto (default: true) */
  extract_text?: boolean;

  /** Opções adicionais */
  options?: ProcessDocumentOptions;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

/**
 * Dados de DANFe extraídos.
 */
export interface DANFeOutputData {
  chaveAcesso: string;
  numero: number;
  serie: number;
  dataEmissao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    uf: string;
  };
  destinatario: {
    cnpjCpf: string;
    razaoSocial: string;
    uf: string;
  };
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    quantidade: number;
    valorTotal: number;
  }>;
  totais: {
    valorProdutos: number;
    valorFrete: number;
    valorTotal: number;
  };
}

/**
 * Dados de DACTe extraídos.
 */
export interface DACTeOutputData {
  chaveCTe: string;
  numero: number;
  serie: number;
  dataEmissao: string;
  cfop: string;
  modal: string;
  tipoServico: string;
  emitente: {
    cnpjCpf: string;
    razaoSocial: string;
    uf: string;
  };
  remetente: {
    cnpjCpf: string;
    razaoSocial: string;
    uf: string;
  };
  destinatario: {
    cnpjCpf: string;
    razaoSocial: string;
    uf: string;
  };
  valores: {
    valorServico: number;
    valorCarga: number;
  };
  documentos: Array<{
    tipo: string;
    chaveNFe?: string;
    numero?: string;
  }>;
}

/**
 * Dados de contrato de frete extraídos.
 */
export interface FreightContractOutputData {
  id: string;
  fileName: string;
  contractType: string;
  contractNumber?: string;
  signatureDate?: string;
  expirationDate?: string;
  parties: {
    contractor: {
      name: string;
      document: string;
      documentType: string;
    };
    contracted: {
      name: string;
      document: string;
      documentType: string;
    };
  };
  financial: {
    pricingType: string;
    baseValue?: number;
    currency: string;
    dueDays: number;
  };
  riskLevel?: string;
  confidence: number;
}

/**
 * Dados genéricos extraídos.
 */
export interface GenericOutputData {
  text: string;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  metadata: {
    pageCount: number;
    title?: string;
    fileSize: number;
  };
}

/**
 * Dados de extrato bancário extraídos (D6 Integration).
 */
export interface BankStatementOutputData {
  /** Informações da conta */
  account: {
    bankCode?: string;
    bankName?: string;
    branchCode?: string;
    accountNumber?: string;
    accountType?: string;
    currency: string;
  };
  /** Período do extrato */
  period: {
    start: string;
    end: string;
    generatedAt?: string;
  };
  /** Saldos */
  balance: {
    opening: number;
    closing: number;
    available?: number;
  };
  /** Estatísticas resumidas */
  statistics: {
    transactionCount: number;
    creditCount: number;
    debitCount: number;
    totalCredits: number;
    totalDebits: number;
    netMovement: number;
    averageAmount: number;
  };
  /** Transações categorizadas */
  transactions: Array<{
    fitId: string;
    date: string;
    postDate?: string;
    description: string;
    normalizedDescription?: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    transactionType: string;
    category?: string;
    categoryConfidence?: number;
    payee?: string;
  }>;
  /** Validação */
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** Parser utilizado */
  parserUsed: 'OFX' | 'CSV';
  /** Formato detectado */
  format: string;
}

/**
 * Output do tool process_document.
 */
export interface ProcessDocumentOutput {
  /** Indica se processamento foi bem-sucedido */
  success: boolean;

  /** Tipo de documento processado */
  document_type: DocumentType;

  /** Tempo de processamento em ms */
  processing_time_ms: number;

  /** Dados extraídos (conforme tipo de documento) */
  data: {
    danfe?: DANFeOutputData;
    dacte?: DACTeOutputData;
    freight_contract?: FreightContractOutputData;
    bank_statement?: BankStatementOutputData;
    generic?: GenericOutputData;
  };

  /** Erros encontrados durante processamento */
  errors?: string[];

  /** Avisos (não bloqueantes) */
  warnings?: string[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Valida o input do process_document.
 * Retorna lista de erros de validação.
 */
export function validateProcessDocumentInput(
  input: unknown
): string[] {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    errors.push('input must be a non-null object');
    return errors;
  }

  const typedInput = input as Record<string, unknown>;

  // Validar document_type
  const validTypes: DocumentType[] = [
    'danfe',
    'dacte',
    'freight_contract',
    'bank_statement',
    'generic',
  ];
  
  if (!typedInput.document_type || typeof typedInput.document_type !== 'string') {
    errors.push('document_type is required and must be a string');
  } else if (!validTypes.includes(typedInput.document_type as DocumentType)) {
    errors.push(
      `document_type must be one of: ${validTypes.join(', ')}`
    );
  }

  // Validar file_name
  if (!typedInput.file_name || typeof typedInput.file_name !== 'string') {
    errors.push('file_name is required and must be a string');
  } else if (typedInput.file_name.trim() === '') {
    errors.push('file_name must be a non-empty string');
  }

  // Validar que pelo menos file_path ou file_base64 foi fornecido
  const hasFilePath = typedInput.file_path && typeof typedInput.file_path === 'string';
  const hasFileBase64 = typedInput.file_base64 && typeof typedInput.file_base64 === 'string';

  if (!hasFilePath && !hasFileBase64) {
    errors.push('Either file_path or file_base64 must be provided');
  }

  // Validar options se fornecido
  if (typedInput.options !== undefined) {
    if (typeof typedInput.options !== 'object' || typedInput.options === null) {
      errors.push('options must be an object if provided');
    } else {
      const options = typedInput.options as Record<string, unknown>;
      
      if (options.language !== undefined && typeof options.language !== 'string') {
        errors.push('options.language must be a string if provided');
      }
      
      if (options.ocr_enabled !== undefined && typeof options.ocr_enabled !== 'boolean') {
        errors.push('options.ocr_enabled must be a boolean if provided');
      }
    }
  }

  // Validar extract_tables se fornecido
  if (typedInput.extract_tables !== undefined && typeof typedInput.extract_tables !== 'boolean') {
    errors.push('extract_tables must be a boolean if provided');
  }

  // Validar extract_text se fornecido
  if (typedInput.extract_text !== undefined && typeof typedInput.extract_text !== 'boolean') {
    errors.push('extract_text must be a boolean if provided');
  }

  return errors;
}

/**
 * Cria output de erro padronizado.
 */
export function createErrorOutput(
  documentType: DocumentType,
  errors: string[],
  processingTimeMs: number = 0
): ProcessDocumentOutput {
  return {
    success: false,
    document_type: documentType,
    processing_time_ms: processingTimeMs,
    data: {},
    errors,
  };
}

/**
 * Cria output de sucesso padronizado.
 */
export function createSuccessOutput(
  documentType: DocumentType,
  data: ProcessDocumentOutput['data'],
  processingTimeMs: number,
  warnings?: string[]
): ProcessDocumentOutput {
  return {
    success: true,
    document_type: documentType,
    processing_time_ms: processingTimeMs,
    data,
    warnings: warnings && warnings.length > 0 ? warnings : undefined,
  };
}
