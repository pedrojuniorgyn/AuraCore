import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { Aliquota } from './Aliquota';
import { BaseCalculo } from './BaseCalculo';

/**
 * Value Object: Valor do Imposto
 * 
 * Representa o valor de um imposto calculado, incluindo:
 * - Base de cálculo
 * - Alíquota aplicada
 * - Valor calculado
 * 
 * Validação: Valor = Base * Alíquota (com tolerância de R$ 0,01)
 */

export interface TaxAmountProps {
  value: Money;
  aliquota: Aliquota;
  baseCalculo: BaseCalculo;
}

export class TaxAmount {
  private readonly _props: TaxAmountProps;

  private constructor(props: TaxAmountProps) {
    this._props = Object.freeze({ ...props });
  }

  /**
   * Valor do imposto
   */
  get value(): Money {
    return this._props.value;
  }

  /**
   * Alíquota aplicada
   */
  get aliquota(): Aliquota {
    return this._props.aliquota;
  }

  /**
   * Base de cálculo
   */
  get baseCalculo(): BaseCalculo {
    return this._props.baseCalculo;
  }

  /**
   * É imposto zero?
   */
  get isZero(): boolean {
    return this._props.value.amount === 0;
  }

  /**
   * Valida se o valor está correto (tolerância de R$ 0,01)
   */
  get isValid(): boolean {
    const expectedValue = this._props.baseCalculo.reducedValue.amount * this._props.aliquota.decimal;
    const difference = Math.abs(this._props.value.amount - expectedValue);
    
    // Tolerância de R$ 0,01 para arredondamentos
    return difference <= 0.01;
  }

  /**
   * Alíquota efetiva (considerando redução de base)
   * 
   * ⚠️ S1.3-FIX: Convertido de getter para método pois Aliquota.zero() retorna Result
   */
  getEffectiveRate(): Result<Aliquota, string> {
    const originalValue = this._props.baseCalculo.originalValue.amount;
    
    if (originalValue === 0) {
      return Aliquota.zero();
    }

    const effectivePercentage = (this._props.value.amount / originalValue) * 100;
    const aliquotaResult = Aliquota.fromPercentage(effectivePercentage);
    
    if (Result.isFail(aliquotaResult)) {
      return Aliquota.zero(); // Fallback já retorna Result
    }
    
    return Result.ok(aliquotaResult.value);
  }

  /**
   * Factory method: calcula automaticamente o valor
   */
  static calculate(baseCalculo: BaseCalculo, aliquota: Aliquota): Result<TaxAmount, string> {
    const applyResult = aliquota.applyTo(baseCalculo.reducedValue);
    
    if (Result.isFail(applyResult)) {
      return Result.fail(`Failed to calculate tax: ${applyResult.error}`);
    }

    const value = applyResult.value;

    return Result.ok(new TaxAmount({ value, aliquota, baseCalculo }));
  }

  /**
   * Factory method: cria com valor específico (para casos de arredondamento)
   */
  static createWithValue(
    value: Money,
    aliquota: Aliquota,
    baseCalculo: BaseCalculo
  ): Result<TaxAmount, string> {
    const taxAmount = new TaxAmount({ value, aliquota, baseCalculo });

    if (!taxAmount.isValid) {
      return Result.fail(
        `Tax amount ${value.amount} is not valid for base ${baseCalculo.reducedValue.amount} and rate ${aliquota.percentual}%. Expected: ${(baseCalculo.reducedValue.amount * aliquota.decimal).toFixed(2)}`
      );
    }

    return Result.ok(taxAmount);
  }

  /**
   * Factory method: imposto zero
   * 
   * ⚠️ S1.3: Agora retorna Result<TaxAmount, string> ao invés de throw (DOMAIN-SVC-004)
   */
  static zero(baseCalculo: BaseCalculo): Result<TaxAmount, string> {
    const zeroMoney = Money.create(0, baseCalculo.originalValue.currency);
    if (Result.isFail(zeroMoney)) {
      return Result.fail('Failed to create zero Money');
    }

    const zeroAliquotaResult = Aliquota.zero();
    if (Result.isFail(zeroAliquotaResult)) {
      return Result.fail(`Failed to create zero aliquota: ${zeroAliquotaResult.error}`);
    }

    return Result.ok(new TaxAmount({
      value: zeroMoney.value,
      aliquota: zeroAliquotaResult.value,
      baseCalculo,
    }));
  }

  /**
   * Verifica igualdade
   */
  equals(other: TaxAmount): boolean {
    return (
      this._props.value.equals(other.value) &&
      this._props.aliquota.equals(other.aliquota) &&
      this._props.baseCalculo.equals(other.baseCalculo)
    );
  }
}

