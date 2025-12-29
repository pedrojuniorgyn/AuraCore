import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';

/**
 * Value Object: Alíquota IBS (Imposto sobre Bens e Serviços)
 * 
 * Representa a alíquota do IBS (unificação de ICMS + ISS).
 * Valores válidos: 0% a 100%
 * 
 * Alíquota padrão estimada: 17,7% (quando implementado 100%)
 * 
 * Período de transição (2026-2032):
 * - 2026: 0,1% (teste)
 * - 2029: 1,77% (10%)
 * - 2030: 3,54% (20%)
 * - 2031: 7,08% (40%)
 * - 2032: 10,62% (60%)
 * - 2033+: 17,70% (100%)
 * 
 * O IBS é dividido em:
 * - IBS UF (estadual)
 * - IBS Municipal
 * 
 * Base Legal: LC 214/2025
 */

export interface AliquotaIBSProps {
  percentual: number;
}

export class AliquotaIBS {
  private readonly _props: AliquotaIBSProps;

  private constructor(props: AliquotaIBSProps) {
    this._props = Object.freeze({ ...props });
  }

  /**
   * Percentual (0-100)
   */
  get percentual(): number {
    return this._props.percentual;
  }

  /**
   * Decimal (0-1)
   */
  get decimal(): number {
    return this._props.percentual / 100;
  }

  /**
   * É alíquota zero?
   */
  get isZero(): boolean {
    return this._props.percentual === 0;
  }

  /**
   * É alíquota de teste (0,1%)?
   */
  get isTestRate(): boolean {
    return Math.abs(this._props.percentual - 0.1) < 0.01;
  }

  /**
   * É alíquota padrão (17,7%)?
   */
  get isStandardRate(): boolean {
    return Math.abs(this._props.percentual - 17.7) < 0.01;
  }

  /**
   * Aplica a alíquota sobre um valor
   */
  applyTo(value: Money): Result<Money, string> {
    const calculatedAmount = value.amount * this.decimal;
    return Money.create(calculatedAmount, value.currency);
  }

  /**
   * Formata para exibição
   */
  get formatted(): string {
    return `${this._props.percentual.toFixed(2)}%`;
  }

  /**
   * Factory method: cria alíquota a partir de percentual
   */
  static fromPercentage(value: number): Result<AliquotaIBS, string> {
    if (value < 0) {
      return Result.fail(`AliquotaIBS cannot be negative: ${value}`);
    }

    if (value > 100) {
      return Result.fail(`AliquotaIBS cannot exceed 100%: ${value}`);
    }

    return Result.ok(new AliquotaIBS({ percentual: value }));
  }

  /**
   * Factory method: cria alíquota a partir de decimal
   */
  static fromDecimal(value: number): Result<AliquotaIBS, string> {
    return AliquotaIBS.fromPercentage(value * 100);
  }

  /**
   * Alíquota zero
   */
  static zero(): AliquotaIBS {
    const result = AliquotaIBS.fromPercentage(0);
    if (Result.isFail(result)) {
      throw new Error('Failed to create zero aliquota IBS');
    }
    return result.value;
  }

  /**
   * Alíquota de teste (0,1%)
   */
  static testRate(): AliquotaIBS {
    const result = AliquotaIBS.fromPercentage(0.1);
    if (Result.isFail(result)) {
      throw new Error('Failed to create test rate aliquota IBS');
    }
    return result.value;
  }

  /**
   * Alíquota padrão (17,7%)
   */
  static standardRate(): AliquotaIBS {
    const result = AliquotaIBS.fromPercentage(17.7);
    if (Result.isFail(result)) {
      throw new Error('Failed to create standard rate aliquota IBS');
    }
    return result.value;
  }

  /**
   * Verifica igualdade (com tolerância de 0.01%)
   */
  equals(other: AliquotaIBS): boolean {
    return Math.abs(this.percentual - other.percentual) < 0.01;
  }
}

