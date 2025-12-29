import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';

/**
 * Value Object: Alíquota CBS (Contribuição sobre Bens e Serviços)
 * 
 * Representa a alíquota da CBS (substitui PIS + COFINS).
 * Valores válidos: 0% a 100%
 * 
 * Alíquota padrão estimada: 8,8% (quando implementado 100%)
 * 
 * Período de transição (2026-2032):
 * - 2026: 0,9% (teste)
 * - 2027+: 8,8% (alíquota cheia, PIS/COFINS extintos)
 * 
 * A CBS é tributo federal que substitui:
 * - PIS (0,65% a 1,65%)
 * - COFINS (3% a 7,6%)
 * 
 * Base Legal: LC 214/2025
 */

export interface AliquotaCBSProps {
  percentual: number;
}

export class AliquotaCBS {
  private readonly _props: AliquotaCBSProps;

  private constructor(props: AliquotaCBSProps) {
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
   * É alíquota de teste (0,9%)?
   */
  get isTestRate(): boolean {
    return Math.abs(this._props.percentual - 0.9) < 0.01;
  }

  /**
   * É alíquota padrão (8,8%)?
   */
  get isStandardRate(): boolean {
    return Math.abs(this._props.percentual - 8.8) < 0.01;
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
  static fromPercentage(value: number): Result<AliquotaCBS, string> {
    if (value < 0) {
      return Result.fail(`AliquotaCBS cannot be negative: ${value}`);
    }

    if (value > 100) {
      return Result.fail(`AliquotaCBS cannot exceed 100%: ${value}`);
    }

    return Result.ok(new AliquotaCBS({ percentual: value }));
  }

  /**
   * Factory method: cria alíquota a partir de decimal
   */
  static fromDecimal(value: number): Result<AliquotaCBS, string> {
    return AliquotaCBS.fromPercentage(value * 100);
  }

  /**
   * Alíquota zero
   */
  static zero(): AliquotaCBS {
    const result = AliquotaCBS.fromPercentage(0);
    if (Result.isFail(result)) {
      throw new Error('Failed to create zero aliquota CBS');
    }
    return result.value;
  }

  /**
   * Alíquota de teste (0,9%)
   */
  static testRate(): AliquotaCBS {
    const result = AliquotaCBS.fromPercentage(0.9);
    if (Result.isFail(result)) {
      throw new Error('Failed to create test rate aliquota CBS');
    }
    return result.value;
  }

  /**
   * Alíquota padrão (8,8%)
   */
  static standardRate(): AliquotaCBS {
    const result = AliquotaCBS.fromPercentage(8.8);
    if (Result.isFail(result)) {
      throw new Error('Failed to create standard rate aliquota CBS');
    }
    return result.value;
  }

  /**
   * Verifica igualdade (com tolerância de 0.01%)
   */
  equals(other: AliquotaCBS): boolean {
    return Math.abs(this.percentual - other.percentual) < 0.01;
  }
}

