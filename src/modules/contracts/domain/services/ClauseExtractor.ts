/**
 * ClauseExtractor - Domain Service
 *
 * Helpers para extração de cláusulas específicas de contratos.
 * 100% Stateless.
 *
 * @module contracts/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D5
 */

import { Result } from '@/shared/domain';

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // CNPJ: 00.000.000/0000-00 ou 00000000000000
  CNPJ: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,

  // CPF: 000.000.000-00 ou 00000000000
  CPF: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,

  // Valores monetários: R$ 1.000,00 ou 1000.00
  CURRENCY: /R\$\s*[\d.,]+|\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g,

  // Datas: 01/01/2024 ou 01-01-2024 ou 1º de janeiro de 2024
  DATE: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}º?\s*de\s*\w+\s*de\s*\d{4}/gi,

  // Percentuais: 10%, 10,5%, 0.5%
  PERCENTAGE: /\d+(?:[,\.]\d+)?%/g,

  // Prazos em dias: 30 dias, 30 (trinta) dias
  DAYS: /(\d+)\s*(?:\([^)]+\))?\s*dias?/gi,

  // Cláusulas: CLÁUSULA PRIMEIRA, Cláusula 1ª
  CLAUSE: /cl[áa]usula\s+(?:primeira|segunda|terceira|quarta|quinta|sexta|s[ée]tima|oitava|nona|d[ée]cima|\d+[ªº]?)/gi,

  // E-mail
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Telefone: (11) 99999-9999
  PHONE: /\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g,

  // Índices de reajuste
  INDEX: /IPCA|IGPM|IGP-M|INPC|CDI|SELIC|DIESEL\s*ANP/gi,
} as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Extrator de cláusulas e dados de contratos.
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 */
export class ClauseExtractor {
  private constructor() {}

  // ==========================================================================
  // EXTRACTION METHODS
  // ==========================================================================

  /**
   * Extrai todos os CNPJs do texto.
   */
  static extractCNPJs(text: string): string[] {
    const matches = text.match(PATTERNS.CNPJ) ?? [];
    return [...new Set(matches.map((m) => this.normalizeCNPJ(m)))];
  }

  /**
   * Extrai todos os CPFs do texto.
   */
  static extractCPFs(text: string): string[] {
    const matches = text.match(PATTERNS.CPF) ?? [];
    return [...new Set(matches.map((m) => this.normalizeCPF(m)))];
  }

  /**
   * Extrai valores monetários do texto.
   */
  static extractCurrencyValues(text: string): number[] {
    const matches = text.match(PATTERNS.CURRENCY) ?? [];
    return matches
      .map((m) => this.parseCurrency(m))
      .filter((v): v is number => v !== null);
  }

  /**
   * Extrai datas do texto.
   */
  static extractDates(text: string): Date[] {
    const matches = text.match(PATTERNS.DATE) ?? [];
    return matches
      .map((m) => this.parseDate(m))
      .filter((d): d is Date => d !== null);
  }

  /**
   * Extrai percentuais do texto.
   */
  static extractPercentages(text: string): number[] {
    const matches = text.match(PATTERNS.PERCENTAGE) ?? [];
    return matches
      .map((m) => this.parsePercentage(m))
      .filter((v): v is number => v !== null);
  }

  /**
   * Extrai prazos em dias do texto.
   */
  static extractDaysPeriods(text: string): number[] {
    const matches: number[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(PATTERNS.DAYS.source, 'gi');

    while ((match = regex.exec(text)) !== null) {
      const days = parseInt(match[1], 10);
      if (!isNaN(days)) {
        matches.push(days);
      }
    }

    return [...new Set(matches)];
  }

  /**
   * Extrai e-mails do texto.
   */
  static extractEmails(text: string): string[] {
    const matches = text.match(PATTERNS.EMAIL) ?? [];
    return [...new Set(matches.map((m) => m.toLowerCase()))];
  }

  /**
   * Extrai telefones do texto.
   */
  static extractPhones(text: string): string[] {
    const matches = text.match(PATTERNS.PHONE) ?? [];
    return [...new Set(matches.map((m) => this.normalizePhone(m)))];
  }

  /**
   * Extrai índices de reajuste do texto.
   */
  static extractReajustmentIndexes(text: string): string[] {
    const matches = text.match(PATTERNS.INDEX) ?? [];
    return [...new Set(matches.map((m) => m.toUpperCase().replace('-', '')))];
  }

  /**
   * Conta cláusulas no texto.
   */
  static countClauses(text: string): number {
    const matches = text.match(PATTERNS.CLAUSE) ?? [];
    return matches.length;
  }

  // ==========================================================================
  // SECTION EXTRACTION
  // ==========================================================================

  /**
   * Extrai seção específica do contrato por título.
   */
  static extractSection(
    text: string,
    sectionTitle: string
  ): Result<string, string> {
    const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(?:cl[áa]usula[^:]*:?\\s*)?${escapedTitle}[:\\s]*([\\s\\S]*?)(?=cl[áa]usula|$)`,
      'i'
    );

    const match = text.match(pattern);
    if (!match || !match[1]) {
      return Result.fail(`Seção "${sectionTitle}" não encontrada`);
    }

    return Result.ok(match[1].trim());
  }

  /**
   * Extrai texto entre dois marcadores.
   */
  static extractBetween(
    text: string,
    startMarker: string,
    endMarker: string
  ): Result<string, string> {
    const start = text.toLowerCase().indexOf(startMarker.toLowerCase());
    if (start === -1) {
      return Result.fail(`Marcador inicial "${startMarker}" não encontrado`);
    }

    const end = text.toLowerCase().indexOf(endMarker.toLowerCase(), start + startMarker.length);
    if (end === -1) {
      // Se não encontrar fim, pega até o final
      return Result.ok(text.slice(start + startMarker.length).trim());
    }

    return Result.ok(text.slice(start + startMarker.length, end).trim());
  }

  // ==========================================================================
  // VALIDATION METHODS
  // ==========================================================================

  /**
   * Valida CNPJ.
   */
  static isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '');

    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    const calcDigit = (base: string, weights: number[]): number => {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(base[i], 10) * weights[i];
      }
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const digit1 = calcDigit(cleaned.slice(0, 12), weights1);
    const digit2 = calcDigit(cleaned.slice(0, 12) + digit1, weights2);

    return cleaned.slice(12) === `${digit1}${digit2}`;
  }

  /**
   * Valida CPF.
   */
  static isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    const calcDigit = (base: string, factor: number): number => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) {
        sum += parseInt(base[i], 10) * (factor - i);
      }
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const digit1 = calcDigit(cleaned.slice(0, 9), 10);
    const digit2 = calcDigit(cleaned.slice(0, 9) + digit1, 11);

    return cleaned.slice(9) === `${digit1}${digit2}`;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private static normalizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  private static normalizeCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  private static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private static parseCurrency(value: string): number | null {
    const cleaned = value
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  private static parsePercentage(value: string): number | null {
    const cleaned = value.replace('%', '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  private static parseDate(dateStr: string): Date | null {
    // Tenta DD/MM/YYYY ou DD-MM-YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      let year = parseInt(slashMatch[3], 10);
      if (year < 100) year += 2000;

      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }

    // Tenta "1º de janeiro de 2024"
    const writtenMatch = dateStr.match(/(\d{1,2})º?\s*de\s*(\w+)\s*de\s*(\d{4})/i);
    if (writtenMatch) {
      const day = parseInt(writtenMatch[1], 10);
      const monthName = writtenMatch[2].toLowerCase();
      const year = parseInt(writtenMatch[3], 10);

      const months: Record<string, number> = {
        janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3,
        maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8,
        outubro: 9, novembro: 10, dezembro: 11,
      };

      const month = months[monthName];
      if (month !== undefined) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  }
}
