/**
 * Docling Integration Types
 * =========================
 *
 * Tipos TypeScript para integração com o serviço Docling.
 * Usados pelo DoclingClient para tipagem de requests/responses.
 *
 * @module shared/infrastructure/docling/types
 * @see E-Agent-Fase-D1
 */

// ============================================================================
// CONFIG
// ============================================================================

/**
 * Configuração do cliente Docling.
 */
export interface DoclingConfig {
  /** URL base do serviço Docling (default: http://localhost:8000) */
  baseUrl: string;

  /** Timeout em ms para requisições (default: 60000 - 60s para PDFs grandes) */
  timeout: number;

  /** Número de retries em caso de falha (default: 3) */
  retries: number;

  /** Delay entre retries em ms (default: 1000) */
  retryDelay: number;
}

// ============================================================================
// EXTRACTION RESULTS
// ============================================================================

/**
 * Bounding box de elemento na página.
 */
export interface BoundingBox {
  /** Posição X (esquerda) */
  x: number;

  /** Posição Y (topo) */
  y: number;

  /** Largura */
  width: number;

  /** Altura */
  height: number;
}

/**
 * Tabela extraída do documento.
 */
export interface ExtractedTable {
  /** Índice da tabela no documento (0-based) */
  index: number;

  /** Cabeçalhos da tabela */
  headers: string[];

  /** Linhas da tabela (cada linha é um array de células) */
  rows: string[][];

  /** Número da página onde a tabela está */
  pageNumber: number;

  /** Posição da tabela na página (opcional) */
  bbox?: BoundingBox;
}

/**
 * Metadados do documento processado.
 */
export interface DocumentMetadata {
  /** Número total de páginas */
  pageCount: number;

  /** Título do documento (se disponível) */
  title?: string;

  /** Autor do documento (se disponível) */
  author?: string;

  /** Data de criação (ISO string) */
  creationDate?: string;

  /** Tamanho do arquivo em bytes */
  fileSize: number;
}

/**
 * Resultado completo de extração de documento.
 */
export interface DocumentExtractionResult {
  /** Texto completo extraído (formato markdown) */
  text: string;

  /** Tabelas extraídas */
  tables: ExtractedTable[];

  /** Metadados do documento */
  metadata: DocumentMetadata;

  /** Tempo de processamento em milissegundos */
  processingTimeMs: number;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Status do serviço Docling.
 */
export interface HealthStatus {
  /** Status do serviço */
  status: 'healthy' | 'unhealthy';

  /** Versão do serviço */
  version: string;

  /** Tempo online em segundos */
  uptime: number;

  /** Versão do Docling */
  doclingVersion: string;
}

// ============================================================================
// API RESPONSES (Raw from FastAPI)
// ============================================================================

/**
 * Resposta raw da API /process.
 * Mapeamento direto do JSON retornado pelo FastAPI.
 */
export interface RawProcessResponse {
  text: string;
  tables: Array<{
    index: number;
    headers: string[];
    rows: string[][];
    page_number: number;
    bbox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }>;
  metadata: {
    page_count: number;
    title?: string | null;
    author?: string | null;
    creation_date?: string | null;
    file_size: number;
  };
  processing_time_ms: number;
}

/**
 * Resposta raw da API /extract-tables.
 */
export interface RawExtractTablesResponse {
  tables: Array<{
    index: number;
    headers: string[];
    rows: string[][];
    page_number: number;
    bbox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }>;
  processing_time_ms: number;
}

/**
 * Resposta raw da API /extract-text.
 */
export interface RawExtractTextResponse {
  text: string;
  processing_time_ms: number;
}

/**
 * Resposta raw da API /health.
 */
export interface RawHealthResponse {
  status: string;
  version: string;
  uptime: number;
  docling_version: string;
}

// ============================================================================
// FISCAL DOCUMENT TYPES (Prepared for D2/D3)
// ============================================================================

/**
 * Produto extraído de DANFe.
 */
export interface DANFeProduto {
  /** Código do produto */
  codigo: string;

  /** Descrição do produto */
  descricao: string;

  /** NCM (Nomenclatura Comum do Mercosul) */
  ncm: string;

  /** CFOP (Código Fiscal de Operações e Prestações) */
  cfop: string;

  /** Unidade de medida */
  unidade: string;

  /** Quantidade */
  quantidade: number;

  /** Valor unitário */
  valorUnitario: number;

  /** Valor total do produto */
  valorTotal: number;

  /** Base de cálculo do ICMS */
  baseIcms: number;

  /** Valor do ICMS */
  valorIcms: number;

  /** Valor do IPI */
  valorIpi: number;

  /** Alíquota ICMS */
  aliquotaIcms: number;

  /** Alíquota IPI */
  aliquotaIpi: number;
}

/**
 * Dados extraídos de DANFe (Documento Auxiliar da Nota Fiscal Eletrônica).
 *
 * @see Phase D2 - Importação de DANFe PDF
 */
export interface DANFeData {
  /** Chave de acesso (44 dígitos) */
  chaveAcesso: string;

  /** Número da NFe */
  numero: number;

  /** Série da NFe */
  serie: number;

  /** Data de emissão */
  dataEmissao: Date;

  /** Dados do emitente */
  emitente: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    uf: string;
    endereco?: string;
    municipio?: string;
  };

  /** Dados do destinatário */
  destinatario: {
    cnpjCpf: string;
    razaoSocial: string;
    inscricaoEstadual?: string;
    uf: string;
    endereco?: string;
    municipio?: string;
  };

  /** Produtos da nota */
  produtos: DANFeProduto[];

  /** Totais da nota */
  totais: {
    valorProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorOutrasDespesas: number;
    valorIpi: number;
    baseIcms: number;
    valorIcms: number;
    valorPis: number;
    valorCofins: number;
    valorTotal: number;
  };

  /** Informações de transporte */
  transporte?: {
    modalidadeFrete: number; // 0-9 conforme tabela
    transportadora?: {
      cnpjCpf?: string;
      razaoSocial?: string;
      uf?: string;
    };
    volumes?: number;
    pesoLiquido?: number;
    pesoBruto?: number;
  };

  /** Informações adicionais */
  informacoesAdicionais?: string;
}

// ============================================================================
// DACTE TYPES (Phase D3)
// ============================================================================

/**
 * Participante de DACTe (emitente, remetente, destinatário, expedidor, recebedor).
 */
export interface DACTeParticipante {
  /** CNPJ ou CPF */
  cnpjCpf: string;

  /** Razão Social ou Nome */
  razaoSocial: string;

  /** Inscrição Estadual (opcional) */
  inscricaoEstadual?: string;

  /** UF */
  uf: string;

  /** Endereço (opcional) */
  endereco?: string;

  /** Município (opcional) */
  municipio?: string;
}

/**
 * Volume de carga do DACTe.
 */
export interface DACTeVolume {
  /** Quantidade de volumes */
  quantidade: number;

  /** Espécie (CAIXA, PALETE, SACARIA, etc) */
  especie: string;

  /** Marca (opcional) */
  marca?: string;

  /** Numeração (opcional) */
  numeracao?: string;

  /** Peso líquido em kg */
  pesoLiquido: number;

  /** Peso bruto em kg */
  pesoBruto: number;

  /** Cubagem em m³ (opcional) */
  cubagem?: number;
}

/**
 * Documento transportado (NFe vinculada ao CTe).
 */
export interface DACTeDocumento {
  /** Tipo de documento */
  tipo: 'NFE' | 'NFSE' | 'OUTROS';

  /** Chave da NFe (se tipo = NFE) */
  chaveNFe?: string;

  /** Número do documento */
  numero?: string;

  /** Série do documento */
  serie?: string;

  /** Data de emissão */
  dataEmissao?: Date;

  /** Valor do documento */
  valor?: number;
}

/**
 * Modal de transporte.
 */
export type DACTeModal =
  | 'RODOVIARIO'
  | 'AEREO'
  | 'AQUAVIARIO'
  | 'FERROVIARIO'
  | 'DUTOVIARIO';

/**
 * Tipo de serviço de transporte.
 */
export type DACTeTipoServico =
  | 'NORMAL'
  | 'SUBCONTRATACAO'
  | 'REDESPACHO'
  | 'REDESPACHO_INTERMEDIARIO';

/**
 * Dados extraídos de DACTe (Documento Auxiliar do Conhecimento de Transporte Eletrônico).
 *
 * @see Phase D3 - Importação de DACTe PDF
 */
export interface DACTeData {
  /** Chave do CTe (44 dígitos) */
  chaveCTe: string;

  /** Número do CTe */
  numero: number;

  /** Série do CTe */
  serie: number;

  /** Data de emissão */
  dataEmissao: Date;

  /** CFOP (5353, 6353, etc) */
  cfop: string;

  /** Natureza da operação */
  naturezaOperacao: string;

  /** Modal de transporte */
  modal: DACTeModal;

  /** Tipo de serviço */
  tipoServico: DACTeTipoServico;

  /** Dados do emitente (transportadora) */
  emitente: DACTeParticipante;

  /** Dados do remetente */
  remetente: DACTeParticipante;

  /** Dados do destinatário */
  destinatario: DACTeParticipante;

  /** Dados do expedidor (opcional) */
  expedidor?: DACTeParticipante;

  /** Dados do recebedor (opcional) */
  recebedor?: DACTeParticipante;

  /** Valores do CTe */
  valores: {
    /** Valor do serviço de transporte */
    valorServico: number;
    /** Valor total a receber */
    valorReceber: number;
    /** Valor total da carga */
    valorCarga: number;
    /** ICMS */
    icms: {
      baseCalculo: number;
      aliquota: number;
      valor: number;
    };
  };

  /** Informações da carga */
  carga: {
    /** Valor total da carga */
    valorCarga: number;
    /** Produto predominante */
    produtoPredominante: string;
    /** Características da carga */
    caracteristicas?: string;
    /** Volumes */
    volumes: DACTeVolume[];
  };

  /** Documentos transportados (NFes vinculadas) */
  documentos: DACTeDocumento[];

  /** Informações do percurso */
  percurso?: {
    /** UF de início */
    ufInicio: string;
    /** UF de fim */
    ufFim: string;
    /** UFs de percurso intermediário */
    ufPercurso?: string[];
  };

  /** Informações adicionais */
  observacoes?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Tipos de erro possíveis no DoclingClient.
 */
export type DoclingErrorType =
  | 'CONNECTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'FILE_NOT_FOUND'
  | 'PROCESSING_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN_ERROR';

/**
 * Detalhes de erro do DoclingClient.
 */
export interface DoclingError {
  /** Tipo do erro */
  type: DoclingErrorType;

  /** Mensagem de erro */
  message: string;

  /** Detalhes adicionais (opcional) */
  details?: string;

  /** Causa original (opcional) */
  cause?: unknown;
}
