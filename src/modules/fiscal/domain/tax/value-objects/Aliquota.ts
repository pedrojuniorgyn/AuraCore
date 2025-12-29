import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';

/**
 * Value Object: Alíquota
 * 
 * Representa uma alíquota tributária em percentual.
 * Valores válidos: 0% a 100%
 * 
 * Exemplos:
 * - ICMS: 7%, 12%, 18%
 * - IPI: 0% a 300% (casos extremos)
 * - PIS: 0,65% (cumulativo), 1,65% (não cumulativo)
 * - COFINS: 3% (cumulativo), 7,6% (não cumulativo)
 * - ISS: 2% a 5%
 */

export interface AliquotaProps {
  percentual: number;
}

export class Aliquota {
  private readonly _props: AliquotaProps;

  private constructor(props: AliquotaProps) {
    this._props = Object.freeze({ ...props });
  }

  /**
   * Percentual (0-100+)
   */
  get percentual(): number {
    return this._props.percentual;
  }

  /**
   * Decimal (0-1+)
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
  static fromPercentage(value: number): Result<Aliquota, string> {
    if (value < 0) {
      return Result.fail(`Aliquota cannot be negative: ${value}`);
    }

    // Permitir alíquotas acima de 100% (IPI, por exemplo)
    if (value > 300) {
      return Result.fail(`Aliquota cannot exceed 300%: ${value}`);
    }

    return Result.ok(new Aliquota({ percentual: value }));
  }

  /**
   * Factory method: cria alíquota a partir de decimal
   */
  static fromDecimal(value: number): Result<Aliquota, string> {
    return Aliquota.fromPercentage(value * 100);
  }

  /**
   * Alíquota zero
   */
  static zero(): Aliquota {
    const result = Aliquota.fromPercentage(0);
    if (Result.isFail(result)) {
      throw new Error('Failed to create zero aliquota');
    }
    return result.value;
  }

  /**
   * Verifica igualdade (com tolerância de 0.01%)
   */
  equals(other: Aliquota): boolean {
    return Math.abs(this.percentual - other.percentual) < 0.01;
  }
}

