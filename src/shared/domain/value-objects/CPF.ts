import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface CPFProps extends Record<string, unknown> {
  value: string;
}

/**
 * Value Object para CPF brasileiro
 * 
 * Invariantes:
 * - Deve ter 11 dígitos
 * - Deve passar validação de dígitos verificadores
 * - Armazenado sem formatação
 */
export class CPF extends ValueObject<CPFProps> {
  private constructor(props: CPFProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Retorna CPF formatado: XXX.XXX.XXX-XX
   */
  get formatted(): string {
    const v = this.props.value;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  }

  /**
   * Factory method
   */
  static create(value: string): Result<CPF, string> {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length !== 11) {
      return Result.fail('CPF must have 11 digits');
    }

    if (!CPF.isValid(cleaned)) {
      return Result.fail('Invalid CPF');
    }

    return Result.ok(new CPF({ value: cleaned }));
  }

  /**
   * Valida CPF com dígitos verificadores
   */
  private static isValid(cpf: string): boolean {
    // Rejeitar CPFs com todos dígitos iguais
    if (/^(\d)\1+$/.test(cpf)) {
      return false;
    }

    // Validar primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== parseInt(cpf[9])) {
      return false;
    }

    // Validar segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== parseInt(cpf[10])) {
      return false;
    }

    return true;
  }

  toString(): string {
    return this.formatted;
  }
}

