/**
 * DANFe Validator - Domain Service
 *
 * Validações de negócio para dados de DANFe extraídos.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/danfe
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D2
 */

import { Result } from '@/shared/domain';
import type { DANFeData } from '@/shared/infrastructure/docling';

// ============================================================================
// TYPES
// ============================================================================

export interface DANFeValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Validador de DANFe
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 */
export class DANFeValidator {
  // Impede instanciação
  private constructor() {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Valida todos os campos obrigatórios e regras de negócio.
   */
  static validate(danfe: DANFeData): Result<void, string> {
    const errors: string[] = [];

    // Validar chave de acesso
    if (!this.isValidChaveAcesso(danfe.chaveAcesso)) {
      errors.push('Chave de acesso inválida (deve ter 44 dígitos numéricos)');
    }

    // Validar CNPJ emitente
    if (!this.isValidCNPJ(danfe.emitente.cnpj)) {
      errors.push('CNPJ do emitente inválido');
    }

    // Validar CNPJ/CPF destinatário
    if (!this.isValidCNPJorCPF(danfe.destinatario.cnpjCpf)) {
      errors.push('CNPJ/CPF do destinatário inválido');
    }

    // Validar produtos
    if (!danfe.produtos || danfe.produtos.length === 0) {
      errors.push('DANFe deve ter pelo menos um produto');
    }

    // Validar totais
    if (danfe.produtos && danfe.produtos.length > 0) {
      const somaProdutos = danfe.produtos.reduce(
        (sum, p) => sum + p.valorTotal,
        0
      );
      const tolerancia = 0.01; // 1 centavo de tolerância
      if (
        Math.abs(somaProdutos - danfe.totais.valorProdutos) > tolerancia
      ) {
        errors.push(
          `Soma dos produtos (${somaProdutos.toFixed(2)}) não confere com total (${danfe.totais.valorProdutos.toFixed(2)})`
        );
      }
    }

    // Validar número e série
    if (danfe.numero <= 0) {
      errors.push('Número da NFe deve ser maior que zero');
    }

    if (danfe.serie < 0) {
      errors.push('Série da NFe não pode ser negativa');
    }

    // Validar data de emissão
    if (!(danfe.dataEmissao instanceof Date) || isNaN(danfe.dataEmissao.getTime())) {
      errors.push('Data de emissão inválida');
    }

    if (errors.length > 0) {
      return Result.fail(errors.join('; '));
    }

    return Result.ok(undefined);
  }

  /**
   * Valida apenas a chave de acesso.
   */
  static validateChaveAcesso(chave: string): Result<void, string> {
    if (!this.isValidChaveAcesso(chave)) {
      return Result.fail('Chave de acesso inválida');
    }
    return Result.ok(undefined);
  }

  // ==========================================================================
  // VALIDATION METHODS
  // ==========================================================================

  /**
   * Verifica se chave de acesso é válida.
   * Deve ter 44 dígitos numéricos.
   */
  static isValidChaveAcesso(chave: string): boolean {
    if (!chave || typeof chave !== 'string') return false;

    // Remover espaços e caracteres não numéricos
    const cleaned = chave.replace(/\D/g, '');

    // Deve ter exatamente 44 dígitos
    if (cleaned.length !== 44) return false;

    // Validar dígito verificador (módulo 11)
    return this.validateChaveVerificador(cleaned);
  }

  /**
   * Valida CNPJ com dígitos verificadores.
   */
  static isValidCNPJ(cnpj: string): boolean {
    if (!cnpj || typeof cnpj !== 'string') return false;

    // Limpar formatação
    const cleaned = cnpj.replace(/\D/g, '');

    // Deve ter 14 dígitos
    if (cleaned.length !== 14) return false;

    // Rejeitar CNPJs com todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Calcular primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i], 10) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[12], 10) !== digit) return false;

    // Calcular segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned[i], 10) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[13], 10) !== digit) return false;

    return true;
  }

  /**
   * Valida CPF com dígitos verificadores.
   */
  static isValidCPF(cpf: string): boolean {
    if (!cpf || typeof cpf !== 'string') return false;

    // Limpar formatação
    const cleaned = cpf.replace(/\D/g, '');

    // Deve ter 11 dígitos
    if (cleaned.length !== 11) return false;

    // Rejeitar CPFs com todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i], 10) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[9], 10) !== digit) return false;

    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i], 10) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[10], 10) !== digit) return false;

    return true;
  }

  /**
   * Valida CNPJ ou CPF.
   */
  static isValidCNPJorCPF(value: string): boolean {
    if (!value || typeof value !== 'string') return false;

    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length === 11) {
      return this.isValidCPF(cleaned);
    }

    if (cleaned.length === 14) {
      return this.isValidCNPJ(cleaned);
    }

    return false;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Valida dígito verificador da chave de acesso (módulo 11).
   */
  private static validateChaveVerificador(chave: string): boolean {
    // Últimos 43 dígitos (sem o dígito verificador)
    const base = chave.substring(0, 43);
    const dvInformado = parseInt(chave[43], 10);

    // Calcular dígito verificador
    let sum = 0;
    let weight = 2;
    for (let i = 42; i >= 0; i--) {
      sum += parseInt(base[i], 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }

    const resto = sum % 11;
    const dvCalculado = resto < 2 ? 0 : 11 - resto;

    return dvInformado === dvCalculado;
  }
}
