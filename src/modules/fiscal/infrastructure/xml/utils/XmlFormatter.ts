import { Money } from '@/shared/domain';

/**
 * XmlFormatter: Utility para formatação de valores para XML
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Formatação de valores decimais (com ponto, não vírgula)
 * - Formatação de datas (ISO 8601)
 * - Formatação de Money (currency)
 * - Formatação de percentuais
 * 
 * Referência: NT 2025.001/002 - Padrões SEFAZ
 */
export class XmlFormatter {
  /**
   * Formata valor decimal para XML
   * 
   * IMPORTANTE: Sempre usa ponto (.) como separador decimal, NUNCA vírgula
   * 
   * @param value Valor numérico
   * @param decimals Número de casas decimais (padrão: 2)
   * @returns String formatada (ex: "1000.50")
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatDecimal(1000.5, 2) // "1000.50"
   * XmlFormatter.formatDecimal(0.1234, 4) // "0.1234"
   * ```
   */
  static formatDecimal(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  /**
   * Formata percentual para XML
   * 
   * @param value Valor percentual (ex: 10.5 para 10.5%)
   * @param decimals Número de casas decimais (padrão: 4)
   * @returns String formatada
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatPercentage(10.5) // "10.5000"
   * XmlFormatter.formatPercentage(0.1, 2) // "0.10"
   * ```
   */
  static formatPercentage(value: number, decimals: number = 4): string {
    return this.formatDecimal(value, decimals);
  }

  /**
   * Formata data para XML (YYYY-MM-DD)
   * 
   * @param date Data a formatar
   * @returns String no formato YYYY-MM-DD
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatDate(new Date('2030-01-15')) // "2030-01-15"
   * ```
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formata data/hora para XML (YYYY-MM-DDTHH:mm:ss)
   * 
   * @param date Data/hora a formatar
   * @returns String no formato ISO 8601
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatDateTime(new Date('2030-01-15T10:30:00Z'))
   * // "2030-01-15T10:30:00.000Z"
   * ```
   */
  static formatDateTime(date: Date): string {
    return date.toISOString();
  }

  /**
   * Formata Money para XML (apenas amount, com 2 decimais)
   * 
   * @param money Value Object Money
   * @returns String formatada com 2 decimais
   * 
   * @example
   * ```typescript
   * const money = Money.create(1000.5, 'BRL').value;
   * XmlFormatter.formatCurrency(money) // "1000.50"
   * ```
   */
  static formatCurrency(money: Money): string {
    return this.formatDecimal(money.amount, 2);
  }

  /**
   * Formata CNPJ/CPF removendo caracteres especiais
   * 
   * @param value CNPJ/CPF com ou sem máscara
   * @returns Apenas dígitos
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatCnpjCpf('12.345.678/0001-90') // "12345678000190"
   * XmlFormatter.formatCnpjCpf('123.456.789-00') // "12345678900"
   * ```
   */
  static formatCnpjCpf(value: string): string {
    return value.replace(/[^\d]/g, '');
  }

  /**
   * Formata CEP removendo caracteres especiais
   * 
   * @param value CEP com ou sem máscara
   * @returns Apenas dígitos
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatCep('01310-100') // "01310100"
   * ```
   */
  static formatCep(value: string): string {
    return value.replace(/[^\d]/g, '');
  }

  /**
   * Formata telefone removendo caracteres especiais
   * 
   * @param value Telefone com ou sem máscara
   * @returns Apenas dígitos
   * 
   * @example
   * ```typescript
   * XmlFormatter.formatPhone('(11) 98765-4321') // "11987654321"
   * ```
   */
  static formatPhone(value: string): string {
    return value.replace(/[^\d]/g, '');
  }

  /**
   * Remove acentos de string (útil para campos que não aceitam acentuação)
   * 
   * @param value String com acentos
   * @returns String sem acentos
   * 
   * @example
   * ```typescript
   * XmlFormatter.removeAccents('São Paulo') // "Sao Paulo"
   * XmlFormatter.removeAccents('José') // "Jose"
   * ```
   */
  static removeAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}

