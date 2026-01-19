/**
 * DACTe Validator - Domain Service
 *
 * Validações de negócio para dados de DACTe extraídos.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/dacte
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D3
 */

import { Result } from '@/shared/domain';
import type { DACTeData, DACTeParticipante } from '@/shared/infrastructure/docling';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * CFOPs válidos para operações de transporte.
 */
const CFOPS_TRANSPORTE = [
  // Prestação de serviço de transporte interestadual
  '5351', '5352', '5353', '5354', '5355', '5356', '5357', '5359',
  '6351', '6352', '6353', '6354', '6355', '6356', '6357', '6359',
  // Transporte internacional
  '7358',
  // Redespacho
  '5932', '6932',
  // Subcontratação
  '5360', '6360',
] as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Validador de DACTe
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 */
export class DACTeValidator {
  // Impede instanciação
  private constructor() {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Valida todos os campos obrigatórios e regras de negócio.
   */
  static validate(dacte: DACTeData): Result<void, string> {
    const errors: string[] = [];

    // Validar chave CTe (modelo 57)
    if (!this.isValidChaveCTe(dacte.chaveCTe)) {
      errors.push('Chave CTe inválida (deve ter 44 dígitos numéricos)');
    }

    // Validar modelo na chave (deve ser 57)
    if (dacte.chaveCTe && !this.isModeloCTe(dacte.chaveCTe)) {
      errors.push('Chave não corresponde a modelo 57 (CTe)');
    }

    // Validar CFOP de transporte
    if (!this.isValidCFOPTransporte(dacte.cfop)) {
      errors.push(`CFOP ${dacte.cfop} não é de operação de transporte`);
    }

    // Validar emitente (obrigatório)
    const emitenteResult = this.validateParticipante(dacte.emitente, 'Emitente');
    if (Result.isFail(emitenteResult)) {
      errors.push(emitenteResult.error);
    }

    // Validar remetente (obrigatório)
    const remetenteResult = this.validateParticipante(dacte.remetente, 'Remetente');
    if (Result.isFail(remetenteResult)) {
      errors.push(remetenteResult.error);
    }

    // Validar destinatário (obrigatório)
    const destResult = this.validateParticipante(dacte.destinatario, 'Destinatário');
    if (Result.isFail(destResult)) {
      errors.push(destResult.error);
    }

    // Validar expedidor (se presente)
    if (dacte.expedidor) {
      const expResult = this.validateParticipante(dacte.expedidor, 'Expedidor');
      if (Result.isFail(expResult)) {
        errors.push(expResult.error);
      }
    }

    // Validar recebedor (se presente)
    if (dacte.recebedor) {
      const recResult = this.validateParticipante(dacte.recebedor, 'Recebedor');
      if (Result.isFail(recResult)) {
        errors.push(recResult.error);
      }
    }

    // Validar valores
    if (dacte.valores.valorServico <= 0) {
      errors.push('Valor do serviço deve ser maior que zero');
    }

    // Validar número e série
    if (dacte.numero <= 0) {
      errors.push('Número do CTe deve ser maior que zero');
    }

    if (dacte.serie < 0) {
      errors.push('Série do CTe não pode ser negativa');
    }

    // Validar data de emissão
    if (!(dacte.dataEmissao instanceof Date) || isNaN(dacte.dataEmissao.getTime())) {
      errors.push('Data de emissão inválida');
    }

    if (errors.length > 0) {
      return Result.fail(errors.join('; '));
    }

    return Result.ok(undefined);
  }

  /**
   * Valida apenas a chave CTe.
   */
  static validateChaveCTe(chave: string): Result<void, string> {
    if (!this.isValidChaveCTe(chave)) {
      return Result.fail('Chave CTe inválida');
    }
    if (!this.isModeloCTe(chave)) {
      return Result.fail('Chave não é de modelo 57 (CTe)');
    }
    return Result.ok(undefined);
  }

  /**
   * Valida um participante.
   */
  static validateParticipante(
    participante: DACTeParticipante | undefined,
    nome: string
  ): Result<void, string> {
    if (!participante) {
      return Result.fail(`${nome} é obrigatório`);
    }

    if (!participante.cnpjCpf) {
      return Result.fail(`CNPJ/CPF do ${nome} é obrigatório`);
    }

    if (!this.isValidCNPJorCPF(participante.cnpjCpf)) {
      return Result.fail(`CNPJ/CPF do ${nome} inválido`);
    }

    if (!participante.razaoSocial) {
      return Result.fail(`Razão Social do ${nome} é obrigatória`);
    }

    if (!participante.uf) {
      return Result.fail(`UF do ${nome} é obrigatória`);
    }

    return Result.ok(undefined);
  }

  // ==========================================================================
  // VALIDATION METHODS - CHAVE CTe
  // ==========================================================================

  /**
   * Verifica se chave CTe é válida (44 dígitos com DV correto).
   */
  static isValidChaveCTe(chave: string): boolean {
    if (!chave || typeof chave !== 'string') return false;

    // Remover espaços e caracteres não numéricos
    const cleaned = chave.replace(/\D/g, '');

    // Deve ter exatamente 44 dígitos
    if (cleaned.length !== 44) return false;

    // Validar dígito verificador (módulo 11)
    return this.validateChaveVerificador(cleaned);
  }

  /**
   * Verifica se a chave é de modelo 57 (CTe).
   * Posições 20-21 da chave = modelo do documento.
   */
  static isModeloCTe(chave: string): boolean {
    if (!chave || chave.length !== 44) return false;
    const modelo = chave.substring(20, 22);
    return modelo === '57';
  }

  /**
   * Verifica se CFOP é de operação de transporte.
   */
  static isValidCFOPTransporte(cfop: string): boolean {
    if (!cfop || typeof cfop !== 'string') return false;
    const cleaned = cfop.replace(/\D/g, '');
    return (CFOPS_TRANSPORTE as readonly string[]).includes(cleaned);
  }

  // ==========================================================================
  // VALIDATION METHODS - CNPJ/CPF (Reutilizado de DANFeValidator)
  // ==========================================================================

  /**
   * Valida CNPJ com dígitos verificadores.
   */
  static isValidCNPJ(cnpj: string): boolean {
    if (!cnpj || typeof cnpj !== 'string') return false;

    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i], 10) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[12], 10) !== digit) return false;

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

    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i], 10) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cleaned[9], 10) !== digit) return false;

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
   * Valida dígito verificador da chave (módulo 11).
   */
  private static validateChaveVerificador(chave: string): boolean {
    const base = chave.substring(0, 43);
    const dvInformado = parseInt(chave[43], 10);

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
