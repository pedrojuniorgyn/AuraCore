/**
 * DACTe Field Extractor - Domain Service
 *
 * Extração de campos específicos do texto e tabelas do DACTe.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/dacte
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D3
 */

import { Result } from '@/shared/domain';
import type {
  ExtractedTable,
  DACTeParticipante,
  DACTeVolume,
  DACTeDocumento,
  DACTeModal,
  DACTeTipoServico,
} from '@/shared/domain';

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // Chave CTe: 44 dígitos numéricos
  CHAVE_CTE: /\b(\d{44})\b/,

  // CNPJ: XX.XXX.XXX/XXXX-XX ou 14 dígitos
  CNPJ: /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g,

  // CPF: XXX.XXX.XXX-XX ou 11 dígitos
  CPF: /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,

  // Inscrição Estadual
  IE: /\bI\.?E\.?:?\s*(\d[\d./-]*\d)\b/i,

  // UF: 2 letras maiúsculas
  UF: /\b([A-Z]{2})\b/g,

  // Data: DD/MM/YYYY
  DATA: /\b(\d{2}\/\d{2}\/\d{4})\b/g,

  // Valor monetário
  VALOR: /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\b/g,

  // CFOP: 4 dígitos começando com 5, 6 ou 7
  CFOP: /\b([567]\d{3})\b/,

  // Chave NFe para documentos transportados
  CHAVE_NFE: /\b(\d{44})\b/g,

  // Peso: formato XX,XXX kg ou XX.XXX kg
  PESO: /\b(\d{1,6}[.,]?\d{0,3})\s*(kg|KG|Kg)?\b/g,
} as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Extrator de campos de DACTe
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 */
export class DACTeFieldExtractor {
  private constructor() {}

  // ==========================================================================
  // CHAVE CTE
  // ==========================================================================

  /**
   * Extrai chave CTe (44 dígitos) do texto.
   */
  static extractChaveCTe(text: string): Result<string, string> {
    if (!text || typeof text !== 'string') {
      return Result.fail('Texto vazio para extração de chave');
    }

    // Buscar 44 dígitos consecutivos
    const digits = text.replace(/\D/g, '');
    for (let i = 0; i <= digits.length - 44; i++) {
      const candidate = digits.substring(i, i + 44);
      // Validar se é CTe (modelo 57 na posição 20-21)
      const modelo = candidate.substring(20, 22);
      if (modelo === '57') {
        return Result.ok(candidate);
      }
    }

    // Fallback: buscar qualquer chave de 44 dígitos
    const match = text.match(PATTERNS.CHAVE_CTE);
    if (match) {
      return Result.ok(match[1]);
    }

    return Result.fail('Chave CTe não encontrada no documento');
  }

  /**
   * Extrai número do CTe a partir da chave.
   * Posições 26-34 (9 dígitos).
   */
  static extractNumeroFromChave(chave: string): number {
    if (!chave || chave.length !== 44) return 0;
    return parseInt(chave.substring(25, 34), 10);
  }

  /**
   * Extrai série do CTe a partir da chave.
   * Posições 23-25 (3 dígitos).
   */
  static extractSerieFromChave(chave: string): number {
    if (!chave || chave.length !== 44) return 0;
    return parseInt(chave.substring(22, 25), 10);
  }

  // ==========================================================================
  // MODAL E TIPO DE SERVIÇO
  // ==========================================================================

  /**
   * Extrai modal de transporte do texto.
   */
  static extractModal(text: string): Result<DACTeModal, string> {
    const upperText = text.toUpperCase();

    if (upperText.includes('RODOVIARIO') || upperText.includes('RODOVIÁRIO')) {
      return Result.ok('RODOVIARIO');
    }
    if (upperText.includes('AEREO') || upperText.includes('AÉREO')) {
      return Result.ok('AEREO');
    }
    if (upperText.includes('AQUAVIARIO') || upperText.includes('AQUAVIÁRIO') || upperText.includes('MARITIMO') || upperText.includes('MARÍTIMO')) {
      return Result.ok('AQUAVIARIO');
    }
    if (upperText.includes('FERROVIARIO') || upperText.includes('FERROVIÁRIO')) {
      return Result.ok('FERROVIARIO');
    }
    if (upperText.includes('DUTOVIARIO') || upperText.includes('DUTOVIÁRIO')) {
      return Result.ok('DUTOVIARIO');
    }

    // Default para CTe rodoviário (mais comum)
    return Result.ok('RODOVIARIO');
  }

  /**
   * Extrai tipo de serviço do texto.
   */
  static extractTipoServico(text: string): Result<DACTeTipoServico, string> {
    const upperText = text.toUpperCase();

    if (upperText.includes('SUBCONTRATA')) {
      return Result.ok('SUBCONTRATACAO');
    }
    if (upperText.includes('REDESPACHO INTERMEDIARIO') || upperText.includes('REDESPACHO INTERMEDIÁRIO')) {
      return Result.ok('REDESPACHO_INTERMEDIARIO');
    }
    if (upperText.includes('REDESPACHO')) {
      return Result.ok('REDESPACHO');
    }

    return Result.ok('NORMAL');
  }

  /**
   * Extrai CFOP do texto.
   */
  static extractCFOP(text: string): Result<string, string> {
    const match = text.match(PATTERNS.CFOP);
    if (match) {
      return Result.ok(match[1]);
    }
    return Result.fail('CFOP não encontrado');
  }

  /**
   * Extrai natureza da operação do texto.
   */
  static extractNaturezaOperacao(text: string): string {
    const labels = [
      'NATUREZA DA OPERACAO',
      'NATUREZA DA OPERAÇÃO',
      'NAT. OPERACAO',
      'NAT. OPERAÇÃO',
    ];

    for (const label of labels) {
      const idx = text.toUpperCase().indexOf(label);
      if (idx !== -1) {
        const afterLabel = text.substring(idx + label.length, idx + label.length + 100);
        const match = afterLabel.match(/[:\s]*([^\n]+)/);
        if (match && match[1]) {
          return match[1].trim().substring(0, 100);
        }
      }
    }

    return 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE';
  }

  // ==========================================================================
  // PARTICIPANTES
  // ==========================================================================

  /**
   * Extrai dados do emitente (transportadora).
   */
  static extractEmitente(
    text: string,
    tables: ExtractedTable[]
  ): Result<DACTeParticipante, string> {
    return this.extractParticipanteBySection(text, tables, [
      'EMITENTE',
      'TRANSPORTADOR',
      'TRANSPORTADORA',
    ], true);
  }

  /**
   * Extrai dados do remetente.
   */
  static extractRemetente(
    text: string,
    tables: ExtractedTable[]
  ): Result<DACTeParticipante, string> {
    return this.extractParticipanteBySection(text, tables, [
      'REMETENTE',
      'REMETENTE DAS MERCADORIAS',
    ], false);
  }

  /**
   * Extrai dados do destinatário.
   */
  static extractDestinatario(
    text: string,
    tables: ExtractedTable[]
  ): Result<DACTeParticipante, string> {
    return this.extractParticipanteBySection(text, tables, [
      'DESTINATARIO',
      'DESTINATÁRIO',
      'DEST',
    ], false);
  }

  /**
   * Extrai dados do expedidor (opcional).
   */
  static extractExpedidor(
    text: string,
    tables: ExtractedTable[]
  ): Result<DACTeParticipante | null, string> {
    const result = this.extractParticipanteBySection(text, tables, [
      'EXPEDIDOR',
    ], false);

    if (Result.isFail(result)) {
      // Expedidor é opcional
      return Result.ok(null);
    }

    return result;
  }

  /**
   * Extrai dados do recebedor (opcional).
   */
  static extractRecebedor(
    text: string,
    tables: ExtractedTable[]
  ): Result<DACTeParticipante | null, string> {
    const result = this.extractParticipanteBySection(text, tables, [
      'RECEBEDOR',
    ], false);

    if (Result.isFail(result)) {
      // Recebedor é opcional
      return Result.ok(null);
    }

    return result;
  }

  // ==========================================================================
  // CARGA E VOLUMES
  // ==========================================================================

  /**
   * Extrai informações da carga.
   */
  static extractCarga(
    text: string,
    tables: ExtractedTable[]
  ): Result<{ valorCarga: number; produtoPredominante: string; caracteristicas?: string; volumes: DACTeVolume[] }, string> {
    // Buscar seção de carga
    const cargaSection = this.extractSection(text, [
      'INFORMACOES DA CARGA',
      'INFORMAÇÕES DA CARGA',
      'DADOS DA CARGA',
      'CARGA',
    ]);

    const searchText = cargaSection || text;

    // Extrair valor da carga
    const valorCarga = this.extractNumericValue(searchText, [
      'VALOR DA CARGA',
      'VALOR TOTAL DA CARGA',
      'VL CARGA',
    ]) || 0;

    // Extrair produto predominante
    let produtoPredominante = this.extractLabeledValue(searchText, [
      'PRODUTO PREDOMINANTE',
      'PROD. PREDOMINANTE',
      'NATUREZA DA CARGA',
    ]);

    if (!produtoPredominante) {
      produtoPredominante = 'MERCADORIAS EM GERAL';
    }

    // Extrair volumes
    const volumes = this.extractVolumes(searchText, tables);

    return Result.ok({
      valorCarga,
      produtoPredominante,
      volumes,
    });
  }

  /**
   * Extrai volumes da carga.
   */
  static extractVolumes(text: string, tables: ExtractedTable[]): DACTeVolume[] {
    const volumes: DACTeVolume[] = [];

    // Buscar tabela de volumes
    const volumeTable = this.findVolumeTable(tables);

    if (volumeTable) {
      for (const row of volumeTable.rows) {
        const volume = this.parseVolumeRow(row);
        if (volume) {
          volumes.push(volume);
        }
      }
    }

    // Se não encontrou tabela, extrair do texto
    if (volumes.length === 0) {
      const qtd = this.extractNumericValue(text, ['QUANTIDADE', 'QTD', 'VOL']) || 1;
      const pesoLiquido = this.extractNumericValue(text, ['PESO LIQUIDO', 'PESO LÍQ', 'P. LIQ']) || 0;
      const pesoBruto = this.extractNumericValue(text, ['PESO BRUTO', 'P. BRUTO']) || pesoLiquido;

      if (qtd > 0 || pesoBruto > 0) {
        volumes.push({
          quantidade: qtd,
          especie: 'VOLUMES',
          pesoLiquido,
          pesoBruto,
        });
      }
    }

    return volumes;
  }

  // ==========================================================================
  // DOCUMENTOS TRANSPORTADOS
  // ==========================================================================

  /**
   * Extrai documentos transportados (NFes vinculadas).
   */
  static extractDocumentos(tables: ExtractedTable[]): Result<DACTeDocumento[], string> {
    const documentos: DACTeDocumento[] = [];

    // Buscar tabela de documentos
    const docTable = this.findDocumentTable(tables);

    if (docTable) {
      for (const row of docTable.rows) {
        const doc = this.parseDocumentoRow(row);
        if (doc) {
          documentos.push(doc);
        }
      }
    }

    // Se não encontrou documentos, retornar array vazio (não é erro)
    return Result.ok(documentos);
  }

  // ==========================================================================
  // VALORES
  // ==========================================================================

  /**
   * Extrai valores do CTe.
   */
  static extractValores(
    text: string,
    tables: ExtractedTable[]
  ): Result<{
    valorServico: number;
    valorReceber: number;
    valorCarga: number;
    icms: { baseCalculo: number; aliquota: number; valor: number };
  }, string> {
    const searchText = text;

    const valorServico = this.extractNumericValue(searchText, [
      'VALOR TOTAL DO SERVICO',
      'VALOR TOTAL DO SERVIÇO',
      'VL TOTAL SERV',
      'VALOR DO SERVICO',
      'VALOR DO SERVIÇO',
    ]) || 0;

    const valorReceber = this.extractNumericValue(searchText, [
      'VALOR A RECEBER',
      'VL A RECEBER',
      'TOTAL A RECEBER',
    ]) || valorServico;

    const valorCarga = this.extractNumericValue(searchText, [
      'VALOR DA CARGA',
      'VL CARGA',
      'VALOR TOTAL DA CARGA',
    ]) || 0;

    const baseIcms = this.extractNumericValue(searchText, [
      'BASE DE CALCULO DO ICMS',
      'BASE DE CÁLCULO DO ICMS',
      'BC ICMS',
      'BASE ICMS',
    ]) || 0;

    const aliquotaIcms = this.extractNumericValue(searchText, [
      'ALIQUOTA ICMS',
      'ALÍQUOTA ICMS',
      '% ICMS',
    ]) || 0;

    const valorIcms = this.extractNumericValue(searchText, [
      'VALOR DO ICMS',
      'VL ICMS',
    ]) || 0;

    return Result.ok({
      valorServico,
      valorReceber,
      valorCarga,
      icms: {
        baseCalculo: baseIcms,
        aliquota: aliquotaIcms,
        valor: valorIcms,
      },
    });
  }

  // ==========================================================================
  // PERCURSO
  // ==========================================================================

  /**
   * Extrai informações do percurso.
   */
  static extractPercurso(text: string): { ufInicio: string; ufFim: string; ufPercurso?: string[] } | undefined {
    const validUFs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
      'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
      'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ];

    // Buscar seção de percurso
    const percursoSection = this.extractSection(text, [
      'PERCURSO',
      'ROTA',
      'INICIO/FIM',
    ]);

    const searchText = percursoSection || text;

    // Buscar UFs no texto
    const matches = searchText.match(PATTERNS.UF);
    const ufs = matches?.filter((uf) => validUFs.includes(uf)) || [];

    if (ufs.length >= 2) {
      return {
        ufInicio: ufs[0],
        ufFim: ufs[ufs.length - 1],
        ufPercurso: ufs.length > 2 ? ufs.slice(1, -1) : undefined,
      };
    }

    return undefined;
  }

  // ==========================================================================
  // DATA DE EMISSÃO
  // ==========================================================================

  /**
   * Extrai data de emissão do texto.
   */
  static extractDataEmissao(text: string): Date {
    const dateLabels = [
      'DATA DE EMISS',
      'DATA DA EMISS',
      'EMISSAO',
      'EMISSÃO',
    ];

    for (const label of dateLabels) {
      const idx = text.toUpperCase().indexOf(label);
      if (idx !== -1) {
        const afterLabel = text.substring(idx, idx + 50);
        const dateMatch = afterLabel.match(PATTERNS.DATA);
        if (dateMatch) {
          return this.parseDate(dateMatch[0]);
        }
      }
    }

    const allDates = text.match(PATTERNS.DATA);
    if (allDates && allDates.length > 0) {
      return this.parseDate(allDates[0]);
    }

    return new Date();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private static extractParticipanteBySection(
    text: string,
    tables: ExtractedTable[],
    sectionNames: string[],
    isEmitente: boolean
  ): Result<DACTeParticipante, string> {
    // Buscar seção
    const section = this.extractSection(text, sectionNames);
    const searchText = section || text;

    // Buscar CNPJ/CPF
    const cnpjMatches = searchText.match(PATTERNS.CNPJ);
    const cpfMatches = searchText.match(PATTERNS.CPF);

    let cnpjCpf = '';
    if (cnpjMatches && cnpjMatches.length > 0) {
      cnpjCpf = (isEmitente ? cnpjMatches[0] : (cnpjMatches[1] || cnpjMatches[0])).replace(/\D/g, '');
    } else if (cpfMatches && cpfMatches.length > 0) {
      cnpjCpf = cpfMatches[0].replace(/\D/g, '');
    }

    if (!cnpjCpf) {
      return Result.fail(`CNPJ/CPF não encontrado para ${sectionNames[0]}`);
    }

    // Buscar Razão Social
    let razaoSocial = this.extractLabeledValue(searchText, [
      'RAZAO SOCIAL',
      'RAZÃO SOCIAL',
      'NOME',
    ]);

    if (!razaoSocial) {
      razaoSocial = `${sectionNames[0]} NÃO IDENTIFICADO`;
    }

    // Buscar IE
    const ieMatch = searchText.match(PATTERNS.IE);
    const inscricaoEstadual = ieMatch ? ieMatch[1].replace(/\D/g, '') : undefined;

    // Buscar UF
    const uf = this.extractUF(searchText);

    return Result.ok({
      cnpjCpf,
      razaoSocial: razaoSocial.substring(0, 150),
      inscricaoEstadual,
      uf,
    });
  }

  private static extractLabeledValue(text: string, labels: string[]): string | null {
    for (const label of labels) {
      const pattern = new RegExp(`${label}[:\\s]*([^\\n]+)`, 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private static extractSection(text: string, markers: string[]): string | null {
    const upperText = text.toUpperCase();
    for (const marker of markers) {
      const idx = upperText.indexOf(marker.toUpperCase());
      if (idx !== -1) {
        return text.substring(idx, idx + 500);
      }
    }
    return null;
  }

  private static extractUF(text: string): string {
    const validUFs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
      'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
      'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ];

    const matches = text.match(PATTERNS.UF);
    if (matches) {
      for (const match of matches) {
        if (validUFs.includes(match)) {
          return match;
        }
      }
    }
    return 'SP';
  }

  private static extractNumericValue(text: string, labels: string[]): number | null {
    for (const label of labels) {
      const pattern = new RegExp(`${label}[:\\s]*([\\d.,]+)`, 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.parseNumber(match[1]);
      }
    }
    return null;
  }

  private static parseNumber(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private static parseDate(dateStr: string): Date {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  }

  private static findVolumeTable(tables: ExtractedTable[]): ExtractedTable | null {
    const keywords = ['QUANTIDADE', 'ESPECIE', 'PESO', 'VOLUME'];

    for (const table of tables) {
      const headerStr = table.headers.join(' ').toUpperCase();
      let score = 0;
      for (const keyword of keywords) {
        if (headerStr.includes(keyword)) score++;
      }
      if (score >= 2) {
        return table;
      }
    }
    return null;
  }

  private static findDocumentTable(tables: ExtractedTable[]): ExtractedTable | null {
    const keywords = ['CHAVE', 'NFE', 'DOCUMENTO', 'NUMERO', 'VALOR'];

    for (const table of tables) {
      const headerStr = table.headers.join(' ').toUpperCase();
      let score = 0;
      for (const keyword of keywords) {
        if (headerStr.includes(keyword)) score++;
      }
      if (score >= 2) {
        return table;
      }
    }
    return null;
  }

  private static parseVolumeRow(row: string[]): DACTeVolume | null {
    if (row.length < 2) return null;

    return {
      quantidade: this.parseNumber(row[0] || '1') || 1,
      especie: row[1] || 'VOLUMES',
      marca: row[2],
      numeracao: row[3],
      pesoLiquido: this.parseNumber(row[4] || '0'),
      pesoBruto: this.parseNumber(row[5] || row[4] || '0'),
      cubagem: row[6] ? this.parseNumber(row[6]) : undefined,
    };
  }

  private static parseDocumentoRow(row: string[]): DACTeDocumento | null {
    if (row.length < 1) return null;

    // Verificar se tem chave de 44 dígitos
    const chaveNFe = row.find((cell) => {
      const digits = cell.replace(/\D/g, '');
      return digits.length === 44;
    });

    return {
      tipo: chaveNFe ? 'NFE' : 'OUTROS',
      chaveNFe: chaveNFe?.replace(/\D/g, ''),
      numero: row[1],
      serie: row[2],
      valor: row[3] ? this.parseNumber(row[3]) : undefined,
    };
  }
}
