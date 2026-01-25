import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota } from './Aliquota';

/**
 * Value Object: Base de Cálculo
 * 
 * Representa a base de cálculo de um imposto, que pode ter redução aplicada.
 * 
 * Base de cálculo = Valor da operação (pode ser reduzida)
 * Base reduzida = Base * (1 - Taxa de redução)
 * 
 * Exemplo:
 * Valor da operação: R$ 1.000,00
 * Redução de 20%
 * Base de cálculo reduzida: R$ 800,00
 */

export interface BaseCalculoProps {
  value: Money;
  reductionRate?: Aliquota;
}

export class BaseCalculo {
  private readonly _props: BaseCalculoProps;

  private constructor(props: BaseCalculoProps) {
    this._props = Object.freeze({ ...props });
  }

  /**
   * Valor original (sem redução)
   */
  get originalValue(): Money {
    return this._props.value;
  }

  /**
   * Taxa de redução (se aplicável)
   */
  get reductionRate(): Aliquota | undefined {
    return this._props.reductionRate;
  }

  /**
   * Tem redução?
   */
  get hasReduction(): boolean {
    return this._props.reductionRate !== undefined && !this._props.reductionRate.isZero;
  }

  /**
   * Valor reduzido (base efetiva para cálculo do imposto)
   */
  get reducedValue(): Money {
    if (!this.hasReduction || !this._props.reductionRate) {
      return this._props.value;
    }

    const reductionMultiplier = 1 - this._props.reductionRate.decimal;
    const reducedAmount = this._props.value.amount * reductionMultiplier;
    
    const moneyResult = Money.create(reducedAmount, this._props.value.currency);
    if (Result.isFail(moneyResult)) {
      // Fallback: retornar valor original se falhar
      return this._props.value;
    }
    return moneyResult.value;
  }

  /**
   * Valor da redução (valor original - valor reduzido)
   * 
   * ⚠️ S1.3: Convertido de getter para método que retorna Result (getters não devem fazer throw)
   */
  getReductionAmount(): Result<Money, string> {
    const subtractResult = this._props.value.subtract(this.reducedValue);
    if (Result.isFail(subtractResult)) {
      // Fallback: zero se falhar
      const zeroResult = Money.create(0, this._props.value.currency);
      if (Result.isFail(zeroResult)) {
        return Result.fail('Failed to create zero Money');
      }
      return Result.ok(zeroResult.value);
    }
    return Result.ok(subtractResult.value);
  }

  /**
   * Factory method: cria base de cálculo sem redução
   */
  static create(value: Money): Result<BaseCalculo, string> {
    if (value.amount < 0) {
      return Result.fail(`Base de cálculo cannot be negative: ${value.amount}`);
    }

    return Result.ok(new BaseCalculo({ value }));
  }

  /**
   * Factory method: cria base de cálculo com redução
   */
  static createWithReduction(value: Money, reductionRate: Aliquota): Result<BaseCalculo, string> {
    if (value.amount < 0) {
      return Result.fail(`Base de cálculo cannot be negative: ${value.amount}`);
    }

    if (reductionRate.percentual > 100) {
      return Result.fail(`Reduction rate cannot exceed 100%: ${reductionRate.percentual}%`);
    }

    return Result.ok(new BaseCalculo({ value, reductionRate }));
  }

  /**
   * Verifica igualdade
   */
  equals(other: BaseCalculo): boolean {
    const sameValue = this._props.value.equals(other.originalValue);
    
    // Verificar redução
    if (!this._props.reductionRate && !other.reductionRate) {
      return sameValue;
    }
    
    if (!this._props.reductionRate || !other.reductionRate) {
      return false;
    }
    
    const sameReduction = this._props.reductionRate.equals(other.reductionRate);
    
    return sameValue && sameReduction;
  }
}

