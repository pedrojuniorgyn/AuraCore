/**
 * DANFe Field Extractor - Domain Service
 *
 * Extração de campos específicos do texto e tabelas do DANFe.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/danfe
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D2
 */

import { Result } from '@/shared/domain';
import type {
  ExtractedTable,
  DANFeProduto,
} from '@/shared/infrastructure/docling';

// ============================================================================
// TYPES
// ============================================================================

export interface DANFeEmitente {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  uf: string;
  endereco?: string;
  municipio?: string;
}

export interface DANFeDestinatario {
  cnpjCpf: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  uf: string;
  endereco?: string;
  municipio?: string;
}

export interface DANFeTotais {
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
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // Chave de acesso: 44 dígitos numéricos
  CHAVE_ACESSO: /\b(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/,
  CHAVE_ACESSO_CLEAN: /\b(\d{44})\b/,

  // CNPJ: XX.XXX.XXX/XXXX-XX ou 14 dígitos
  CNPJ: /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g,

  // CPF: XXX.XXX.XXX-XX ou 11 dígitos
  CPF: /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,

  // Inscrição Estadual: varia por estado
  IE: /\bI\.?E\.?:?\s*(\d[\d./-]*\d)\b/i,

  // UF: 2 letras maiúsculas
  UF: /\b([A-Z]{2})\b/g,

  // Data: DD/MM/YYYY
  DATA: /\b(\d{2}\/\d{2}\/\d{4})\b/g,

  // Valor monetário: 1.234,56 ou 1234.56
  VALOR: /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\b/g,

  // NCM: 8 dígitos
  NCM: /\b(\d{4}\.?\d{2}\.?\d{2})\b/,

  // CFOP: 4 dígitos
  CFOP: /\b([1-7]\d{3})\b/,
} as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Extrator de campos de DANFe
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 */
export class DANFeFieldExtractor {
  private constructor() {}

  // ==========================================================================
  // CHAVE DE ACESSO
  // ==========================================================================

  /**
   * Extrai chave de acesso (44 dígitos) do texto.
   */
  static extractChaveAcesso(text: string): Result<string, string> {
    if (!text || typeof text !== 'string') {
      return Result.fail('Texto vazio para extração de chave');
    }

    // Primeiro tentar encontrar 44 dígitos consecutivos
    const cleanText = text.replace(/\s+/g, ' ');
    const cleanMatch = cleanText.replace(/\D/g, '').match(/\d{44}/);
    if (cleanMatch) {
      return Result.ok(cleanMatch[0]);
    }

    // Tentar padrão com espaços
    const match = text.match(PATTERNS.CHAVE_ACESSO);
    if (match) {
      const chave = match[1].replace(/\s/g, '');
      if (chave.length === 44) {
        return Result.ok(chave);
      }
    }

    // Buscar no texto por sequência de dígitos que pode estar formatada
    const digits = text.replace(/\D/g, '');
    for (let i = 0; i <= digits.length - 44; i++) {
      const candidate = digits.substring(i, i + 44);
      // Validar se parece uma chave (começa com código UF válido)
      const uf = parseInt(candidate.substring(0, 2), 10);
      if (uf >= 11 && uf <= 53) {
        return Result.ok(candidate);
      }
    }

    return Result.fail('Chave de acesso não encontrada no documento');
  }

  /**
   * Extrai número da NFe a partir da chave de acesso.
   * Posições 26-34 da chave (9 dígitos).
   */
  static extractNumeroFromChave(chave: string): number {
    if (!chave || chave.length !== 44) return 0;
    return parseInt(chave.substring(25, 34), 10);
  }

  /**
   * Extrai série da NFe a partir da chave de acesso.
   * Posições 23-25 da chave (3 dígitos).
   */
  static extractSerieFromChave(chave: string): number {
    if (!chave || chave.length !== 44) return 0;
    return parseInt(chave.substring(22, 25), 10);
  }

  // ==========================================================================
  // EMITENTE
  // ==========================================================================

  /**
   * Extrai dados do emitente do texto e tabelas.
   */
  static extractEmitente(
    text: string,
    tables: ExtractedTable[]
  ): Result<DANFeEmitente, string> {
    // Buscar CNPJ do emitente
    const cnpjMatch = text.match(PATTERNS.CNPJ);
    if (!cnpjMatch || cnpjMatch.length === 0) {
      return Result.fail('CNPJ do emitente não encontrado');
    }

    const cnpj = cnpjMatch[0].replace(/\D/g, '');

    // Buscar Razão Social (geralmente após "RAZAO SOCIAL" ou no início)
    let razaoSocial = this.extractLabeledValue(
      text,
      ['RAZAO SOCIAL', 'RAZÃO SOCIAL', 'NOME/RAZAO', 'NOME / RAZÃO']
    );

    if (!razaoSocial) {
      // Tentar extrair da primeira linha significativa
      const lines = text.split('\n').filter((l) => l.trim().length > 10);
      razaoSocial = lines[0]?.trim() || 'EMITENTE NÃO IDENTIFICADO';
    }

    // Buscar IE
    const ieMatch = text.match(PATTERNS.IE);
    const inscricaoEstadual = ieMatch
      ? ieMatch[1].replace(/\D/g, '')
      : '';

    // Buscar UF
    const uf = this.extractUF(text);

    return Result.ok({
      cnpj,
      razaoSocial: razaoSocial.substring(0, 150), // Limitar tamanho
      inscricaoEstadual,
      uf,
    });
  }

  // ==========================================================================
  // DESTINATÁRIO
  // ==========================================================================

  /**
   * Extrai dados do destinatário do texto.
   */
  static extractDestinatario(
    text: string,
    tables: ExtractedTable[]
  ): Result<DANFeDestinatario, string> {
    // Procurar seção de destinatário
    const destSection = this.extractSection(text, [
      'DESTINATARIO',
      'DESTINATÁRIO',
      'DEST/REM',
      'REMETENTE',
    ]);

    const searchText = destSection || text;

    // Buscar CNPJ/CPF
    const cnpjMatches = searchText.match(PATTERNS.CNPJ);
    const cpfMatches = searchText.match(PATTERNS.CPF);

    let cnpjCpf = '';
    if (cnpjMatches && cnpjMatches.length > 0) {
      // Se temos mais de um CNPJ, o segundo geralmente é do destinatário
      cnpjCpf = (cnpjMatches[1] || cnpjMatches[0]).replace(/\D/g, '');
    } else if (cpfMatches && cpfMatches.length > 0) {
      cnpjCpf = cpfMatches[0].replace(/\D/g, '');
    }

    if (!cnpjCpf) {
      return Result.fail('CNPJ/CPF do destinatário não encontrado');
    }

    // Buscar Razão Social
    let razaoSocial = this.extractLabeledValue(destSection || text, [
      'RAZAO SOCIAL',
      'RAZÃO SOCIAL',
      'NOME',
    ]);

    if (!razaoSocial) {
      razaoSocial = 'DESTINATÁRIO NÃO IDENTIFICADO';
    }

    // Buscar UF
    const ufMatches = (destSection || text).match(PATTERNS.UF);
    const uf =
      ufMatches?.find((u) => this.isValidUF(u)) || this.extractUF(text);

    return Result.ok({
      cnpjCpf,
      razaoSocial: razaoSocial.substring(0, 150),
      uf,
    });
  }

  // ==========================================================================
  // PRODUTOS
  // ==========================================================================

  /**
   * Extrai lista de produtos das tabelas.
   */
  static extractProdutos(tables: ExtractedTable[]): Result<DANFeProduto[], string> {
    const produtos: DANFeProduto[] = [];

    // Encontrar tabela de produtos (maior tabela com colunas de produtos)
    const produtoTable = this.findProductTable(tables);

    if (!produtoTable) {
      return Result.fail('Tabela de produtos não encontrada');
    }

    // Mapear colunas
    const columnMap = this.mapProductColumns(produtoTable.headers);

    // Extrair produtos
    for (let i = 0; i < produtoTable.rows.length; i++) {
      const row = produtoTable.rows[i];
      const produto = this.parseProductRow(row, columnMap, i);

      if (produto) {
        produtos.push(produto);
      }
    }

    if (produtos.length === 0) {
      return Result.fail('Nenhum produto extraído da tabela');
    }

    return Result.ok(produtos);
  }

  // ==========================================================================
  // TOTAIS
  // ==========================================================================

  /**
   * Extrai totais da nota do texto e tabelas.
   */
  static extractTotais(
    text: string,
    tables: ExtractedTable[]
  ): Result<DANFeTotais, string> {
    // Valores padrão
    const totais: DANFeTotais = {
      valorProdutos: 0,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorOutrasDespesas: 0,
      valorIpi: 0,
      baseIcms: 0,
      valorIcms: 0,
      valorPis: 0,
      valorCofins: 0,
      valorTotal: 0,
    };

    // Buscar seção de totais
    const totaisSection = this.extractSection(text, [
      'CALCULO DO IMPOSTO',
      'CÁLCULO DO IMPOSTO',
      'TOTAIS',
      'TOTAL DA NOTA',
    ]);

    const searchText = totaisSection || text;

    // Extrair valores
    totais.valorProdutos =
      this.extractNumericValue(searchText, [
        'VALOR TOTAL DOS PRODUTOS',
        'VL TOTAL PRODUTOS',
        'TOTAL PRODUTOS',
      ]) || 0;

    totais.valorFrete =
      this.extractNumericValue(searchText, ['VALOR DO FRETE', 'FRETE']) || 0;

    totais.valorSeguro =
      this.extractNumericValue(searchText, ['VALOR DO SEGURO', 'SEGURO']) || 0;

    totais.valorDesconto =
      this.extractNumericValue(searchText, ['DESCONTO', 'VALOR DO DESCONTO']) ||
      0;

    totais.valorOutrasDespesas =
      this.extractNumericValue(searchText, [
        'OUTRAS DESPESAS',
        'DESPESAS ACESSORIAS',
      ]) || 0;

    totais.baseIcms =
      this.extractNumericValue(searchText, [
        'BASE DE CALCULO DO ICMS',
        'BASE DE CÁLCULO DO ICMS',
        'BASE DE CALC',
        'BC ICMS',
        'BASE ICMS',
      ]) || 0;

    totais.valorIcms =
      this.extractNumericValue(searchText, ['VALOR DO ICMS', 'VALOR ICMS']) ||
      0;

    totais.valorIpi =
      this.extractNumericValue(searchText, ['VALOR DO IPI', 'VALOR IPI']) || 0;

    totais.valorPis =
      this.extractNumericValue(searchText, ['PIS', 'VALOR PIS']) || 0;

    totais.valorCofins =
      this.extractNumericValue(searchText, ['COFINS', 'VALOR COFINS']) || 0;

    totais.valorTotal =
      this.extractNumericValue(searchText, [
        'VALOR TOTAL DA NOTA',
        'TOTAL DA NOTA',
        'VALOR TOTAL',
      ]) || 0;

    // Se não encontrou total da nota, calcular
    if (totais.valorTotal === 0 && totais.valorProdutos > 0) {
      totais.valorTotal =
        totais.valorProdutos +
        totais.valorFrete +
        totais.valorSeguro +
        totais.valorIpi +
        totais.valorOutrasDespesas -
        totais.valorDesconto;
    }

    return Result.ok(totais);
  }

  // ==========================================================================
  // DATA DE EMISSÃO
  // ==========================================================================

  /**
   * Extrai data de emissão do texto.
   */
  static extractDataEmissao(text: string): Date {
    // Buscar data após labels conhecidos
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

    // Fallback: primeira data encontrada
    const allDates = text.match(PATTERNS.DATA);
    if (allDates && allDates.length > 0) {
      return this.parseDate(allDates[0]);
    }

    return new Date();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private static extractLabeledValue(
    text: string,
    labels: string[]
  ): string | null {
    for (const label of labels) {
      const pattern = new RegExp(
        `${label}[:\\s]*([^\\n]+)`,
        'i'
      );
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
        // Retornar próximos 500 caracteres
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
    return 'SP'; // Default
  }

  private static isValidUF(uf: string): boolean {
    const validUFs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
      'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
      'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ];
    return validUFs.includes(uf);
  }

  private static extractNumericValue(
    text: string,
    labels: string[]
  ): number | null {
    for (const label of labels) {
      const pattern = new RegExp(
        `${label}[:\\s]*([\\d.,]+)`,
        'i'
      );
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.parseNumber(match[1]);
      }
    }
    return null;
  }

  private static parseNumber(value: string): number {
    if (!value) return 0;
    // Formato brasileiro: 1.234,56 -> 1234.56
    const cleaned = value
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private static parseDate(dateStr: string): Date {
    // Formato DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  }

  private static findProductTable(
    tables: ExtractedTable[]
  ): ExtractedTable | null {
    // Procurar tabela com headers de produto
    const productKeywords = [
      'CODIGO', 'CÓDIGO', 'DESCRI', 'PRODUTO', 'QTD', 'QUANT',
      'VALOR', 'UNIT', 'TOTAL', 'NCM', 'CFOP',
    ];

    let bestTable: ExtractedTable | null = null;
    let bestScore = 0;

    for (const table of tables) {
      let score = 0;
      const headerStr = table.headers.join(' ').toUpperCase();

      for (const keyword of productKeywords) {
        if (headerStr.includes(keyword)) {
          score++;
        }
      }

      // Preferir tabelas com mais linhas
      if (score >= 3 && table.rows.length > 0) {
        const totalScore = score + table.rows.length / 10;
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestTable = table;
        }
      }
    }

    return bestTable;
  }

  private static mapProductColumns(
    headers: string[]
  ): Record<string, number> {
    const map: Record<string, number> = {};
    const upperHeaders = headers.map((h) => h.toUpperCase());

    // Mapear colunas conhecidas
    const mappings: Record<string, string[]> = {
      codigo: ['CODIGO', 'CÓDIGO', 'COD', 'CÓD'],
      descricao: ['DESCRICAO', 'DESCRIÇÃO', 'DESC', 'PRODUTO'],
      ncm: ['NCM', 'NCM/SH'],
      cfop: ['CFOP', 'CF'],
      unidade: ['UNIDADE', 'UN', 'UND', 'UM'],
      quantidade: ['QUANTIDADE', 'QTD', 'QUANT', 'QTE'],
      valorUnitario: ['VALOR UNIT', 'VL UNIT', 'UNIT', 'UNITARIO', 'UNITÁRIO'],
      valorTotal: ['VALOR TOTAL', 'VL TOTAL', 'TOTAL', 'SUBTOTAL'],
      baseIcms: ['BASE ICMS', 'BC ICMS', 'BASE'],
      valorIcms: ['VALOR ICMS', 'VL ICMS', 'ICMS'],
      aliquotaIcms: ['ALIQ ICMS', 'ALÍQ ICMS', '%ICMS'],
      valorIpi: ['VALOR IPI', 'VL IPI', 'IPI'],
      aliquotaIpi: ['ALIQ IPI', 'ALÍQ IPI', '%IPI'],
    };

    for (const [key, aliases] of Object.entries(mappings)) {
      for (let i = 0; i < upperHeaders.length; i++) {
        for (const alias of aliases) {
          if (upperHeaders[i].includes(alias)) {
            map[key] = i;
            break;
          }
        }
        if (map[key] !== undefined) break;
      }
    }

    return map;
  }

  private static parseProductRow(
    row: string[],
    columnMap: Record<string, number>,
    index: number
  ): DANFeProduto | null {
    const getValue = (key: string): string => {
      const idx = columnMap[key];
      return idx !== undefined && idx < row.length ? row[idx] : '';
    };

    const codigo = getValue('codigo');
    const descricao = getValue('descricao');
    const quantidade = this.parseNumber(getValue('quantidade'));
    const valorTotal = this.parseNumber(getValue('valorTotal'));

    // Validar campos obrigatórios
    if (!descricao && !codigo) {
      return null;
    }

    if (quantidade === 0 && valorTotal === 0) {
      return null;
    }

    return {
      codigo: codigo || `ITEM-${index + 1}`,
      descricao: descricao || `Produto ${index + 1}`,
      ncm: getValue('ncm').replace(/\D/g, ''),
      cfop: getValue('cfop').replace(/\D/g, ''),
      unidade: getValue('unidade') || 'UN',
      quantidade: quantidade || 1,
      valorUnitario:
        this.parseNumber(getValue('valorUnitario')) ||
        (quantidade > 0 ? valorTotal / quantidade : valorTotal),
      valorTotal: valorTotal,
      baseIcms: this.parseNumber(getValue('baseIcms')) || valorTotal,
      valorIcms: this.parseNumber(getValue('valorIcms')) || 0,
      valorIpi: this.parseNumber(getValue('valorIpi')) || 0,
      aliquotaIcms: this.parseNumber(getValue('aliquotaIcms')) || 0,
      aliquotaIpi: this.parseNumber(getValue('aliquotaIpi')) || 0,
    };
  }
}
