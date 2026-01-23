/**
 * Document Extraction Domain Types
 * 
 * Tipos puros do domain para extração e processamento de documentos.
 * Estes tipos são independentes de implementação (Docling, Tesseract, etc).
 * 
 * @see ARCH-002: Domain não importa de Infrastructure
 */

// ============================================
// GENERIC EXTRACTION TYPES
// ============================================

/**
 * Bounding box de elemento na página.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tabela extraída de documento.
 */
export interface ExtractedTable {
  index: number;
  headers: string[];
  rows: string[][];
  pageNumber: number;
  bbox?: BoundingBox;
}

/**
 * Metadados de documento processado.
 */
export interface DocumentMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: string;
  fileSize: number;
}

/**
 * Resultado de extração de documento.
 */
export interface DocumentExtractionResult {
  text: string;
  tables: ExtractedTable[];
  metadata: DocumentMetadata;
  processingTimeMs: number;
}

// ============================================
// DANFE TYPES
// ============================================

/**
 * Produto extraído de DANFe.
 */
export interface DANFeProduto {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseIcms: number;
  valorIcms: number;
  valorIpi: number;
  aliquotaIcms: number;
  aliquotaIpi: number;
}

/**
 * Dados extraídos de DANFe.
 */
export interface DANFeData {
  chaveAcesso: string;
  numero: number;
  serie: number;
  dataEmissao: Date;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    uf: string;
    endereco?: string;
    municipio?: string;
  };
  destinatario: {
    cnpjCpf: string;
    razaoSocial: string;
    inscricaoEstadual?: string;
    uf: string;
    endereco?: string;
    municipio?: string;
  };
  produtos: DANFeProduto[];
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
  transporte?: {
    modalidadeFrete: number;
    transportadora?: {
      cnpjCpf?: string;
      razaoSocial?: string;
      uf?: string;
    };
    volumes?: number;
    pesoLiquido?: number;
    pesoBruto?: number;
  };
  informacoesAdicionais?: string;
}

// ============================================
// DACTE TYPES
// ============================================

/**
 * Participante de DACTe.
 */
export interface DACTeParticipante {
  cnpjCpf: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  uf: string;
  endereco?: string;
  municipio?: string;
}

/**
 * Volume de carga do DACTe.
 */
export interface DACTeVolume {
  quantidade: number;
  especie: string;
  marca?: string;
  numeracao?: string;
  pesoLiquido: number;
  pesoBruto: number;
  cubagem?: number;
}

/**
 * Documento transportado.
 */
export interface DACTeDocumento {
  tipo: 'NFE' | 'NFSE' | 'OUTROS';
  chaveNFe?: string;
  numero?: string;
  serie?: string;
  dataEmissao?: Date;
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
 * Dados extraídos de DACTe.
 */
export interface DACTeData {
  chaveCTe: string;
  numero: number;
  serie: number;
  dataEmissao: Date;
  cfop: string;
  naturezaOperacao: string;
  modal: DACTeModal;
  tipoServico: DACTeTipoServico;
  emitente: DACTeParticipante;
  remetente: DACTeParticipante;
  destinatario: DACTeParticipante;
  expedidor?: DACTeParticipante;
  recebedor?: DACTeParticipante;
  valores: {
    valorServico: number;
    valorReceber: number;
    valorCarga: number;
    icms: {
      baseCalculo: number;
      aliquota: number;
      valor: number;
    };
  };
  carga: {
    valorCarga: number;
    produtoPredominante: string;
    caracteristicas?: string;
    volumes: DACTeVolume[];
  };
  documentos: DACTeDocumento[];
  percurso?: {
    ufInicio: string;
    ufFim: string;
    ufPercurso?: string[];
  };
  observacoes?: string;
}
