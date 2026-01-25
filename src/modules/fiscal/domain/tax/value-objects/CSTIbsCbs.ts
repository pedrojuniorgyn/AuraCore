import { Result } from '@/shared/domain';

/**
 * Value Object: CST IBS/CBS (Código de Situação Tributária do IBS/CBS)
 * 
 * Estrutura: XY (2 dígitos)
 * Valores válidos: 00, 10, 20, 30, 40, 41, 50, 60, 70, 90
 * 
 * Códigos:
 * 00 - Tributação normal
 * 10 - Tributação com suspensão
 * 20 - Tributação monofásica
 * 30 - Tributação com diferimento
 * 40 - Isenção
 * 41 - Não incidência
 * 50 - Imunidade
 * 60 - Tributação com redução de base de cálculo
 * 70 - Tributação com crédito presumido
 * 90 - Outros
 * 
 * Base Legal: LC 214/2025, Ato Conjunto CGIBS/RFB 01/2025
 */

export interface CSTIbsCbsProps {
  code: string;
}

export class CSTIbsCbs {
  private readonly _props: CSTIbsCbsProps;

  private constructor(props: CSTIbsCbsProps) {
    this._props = Object.freeze({ ...props });
  }

  get code(): string {
    return this._props.code;
  }

  get value(): string {
    return this._props.code;
  }

  /**
   * É tributação normal?
   */
  get isTributadoNormal(): boolean {
    return this._props.code === '00';
  }

  /**
   * Tem suspensão?
   */
  get hasSuspensao(): boolean {
    return this._props.code === '10';
  }

  /**
   * É monofásico?
   */
  get isMonofasico(): boolean {
    return this._props.code === '20';
  }

  /**
   * Tem diferimento?
   */
  get hasDiferimento(): boolean {
    return this._props.code === '30';
  }

  /**
   * É isento?
   */
  get isIsento(): boolean {
    return this._props.code === '40';
  }

  /**
   * Há não incidência?
   */
  get hasNaoIncidencia(): boolean {
    return this._props.code === '41';
  }

  /**
   * Tem imunidade?
   */
  get hasImunidade(): boolean {
    return this._props.code === '50';
  }

  /**
   * Tem redução de base de cálculo?
   */
  get hasReducaoBC(): boolean {
    return this._props.code === '60';
  }

  /**
   * Tem crédito presumido?
   */
  get hasCreditoPresumido(): boolean {
    return this._props.code === '70';
  }

  /**
   * É outros?
   */
  get isOutros(): boolean {
    return this._props.code === '90';
  }

  /**
   * CST não gera crédito?
   */
  get naoGeraCreditoNormal(): boolean {
    return ['40', '41', '50'].includes(this._props.code);
  }

  /**
   * Descrição do CST
   */
  get description(): string {
    const descriptions: Record<string, string> = {
      '00': 'Tributação normal',
      '10': 'Tributação com suspensão',
      '20': 'Tributação monofásica',
      '30': 'Tributação com diferimento',
      '40': 'Isenção',
      '41': 'Não incidência',
      '50': 'Imunidade',
      '60': 'Tributação com redução de BC',
      '70': 'Tributação com crédito presumido',
      '90': 'Outros',
    };
    return descriptions[this._props.code] ?? 'Desconhecido';
  }

  /**
   * Factory method
   */
  static create(code: string): Result<CSTIbsCbs, string> {
    // Remover formatação
    const cleanCode = code.replace(/\D/g, '');

    // Validar tamanho
    if (cleanCode.length !== 2) {
      return Result.fail(`CST IBS/CBS must have 2 digits, got: ${code}`);
    }

    // Validar valores permitidos
    const validCodes = ['00', '10', '20', '30', '40', '41', '50', '60', '70', '90'];
    if (!validCodes.includes(cleanCode)) {
      return Result.fail(
        `Invalid CST IBS/CBS: ${cleanCode}. Must be one of: ${validCodes.join(', ')}`
      );
    }

    return Result.ok(new CSTIbsCbs({ code: cleanCode }));
  }

  /**
   * CST para tributação normal (00)
   * 
   * ⚠️ S1.3: Agora retorna Result<CSTIbsCbs, string> ao invés de throw
   */
  static tributacaoNormal(): Result<CSTIbsCbs, string> {
    return CSTIbsCbs.create('00');
  }

  /**
   * CST para isenção (40)
   * 
   * ⚠️ S1.3: Agora retorna Result<CSTIbsCbs, string> ao invés de throw
   */
  static isencao(): Result<CSTIbsCbs, string> {
    return CSTIbsCbs.create('40');
  }

  /**
   * Verifica igualdade
   */
  equals(other: CSTIbsCbs): boolean {
    return this._props.code === other.code;
  }
}

