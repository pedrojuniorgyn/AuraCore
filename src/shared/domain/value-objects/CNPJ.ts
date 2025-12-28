import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface CNPJProps extends Record<string, unknown> {
  value: string;
}

/**
 * Value Object para CNPJ brasileiro
 * 
 * Invariantes:
 * - Deve ter 14 dígitos
 * - Deve passar validação de dígitos verificadores
 * - Armazenado sem formatação
 */
export class CNPJ extends ValueObject<CNPJProps> {
  private constructor(props: CNPJProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Retorna CNPJ formatado: XX.XXX.XXX/XXXX-XX
   */
  get formatted(): string {
    const v = this.props.value;
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  }

  /**
   * Factory method
   */
  static create(value: string): Result<CNPJ, string> {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length !== 14) {
      return Result.fail('CNPJ must have 14 digits');
    }

    if (!CNPJ.isValid(cleaned)) {
      return Result.fail('Invalid CNPJ');
    }

    return Result.ok(new CNPJ({ value: cleaned }));
  }

  /**
   * Valida CNPJ com dígitos verificadores
   */
  private static isValid(cnpj: string): boolean {
    // Rejeitar CNPJs com todos dígitos iguais
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Validar primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj[12])) {
      return false;
    }

    // Validar segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj[13])) {
      return false;
    }

    return true;
  }

  toString(): string {
    return this.formatted;
  }
}

