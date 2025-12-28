import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';
import { Money } from './Money';

interface TaxRateProps extends Record<string, unknown> {
  rate: number; // Percentual (ex: 1.5 para 1.5%)
  name: string;
  code?: string;
}

/**
 * Value Object para taxa de imposto
 * 
 * Invariantes:
 * - Rate deve ser >= 0 e <= 100
 * - Name não pode ser vazio
 */
export class TaxRate extends ValueObject<TaxRateProps> {
  private constructor(props: TaxRateProps) {
    super(props);
  }

  get rate(): number {
    return this.props.rate;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string | undefined {
    return this.props.code;
  }

  /**
   * Taxa como decimal (ex: 0.015 para 1.5%)
   */
  get asDecimal(): number {
    return this.props.rate / 100;
  }

  /**
   * Factory method
   */
  static create(rate: number, name: string, code?: string): Result<TaxRate, string> {
    if (!Number.isFinite(rate)) {
      return Result.fail('Rate must be a finite number');
    }

    if (rate < 0) {
      return Result.fail('Rate cannot be negative');
    }

    if (rate > 100) {
      return Result.fail('Rate cannot exceed 100%');
    }

    if (!name || name.trim() === '') {
      return Result.fail('Name cannot be empty');
    }

    return Result.ok(new TaxRate({
      rate,
      name: name.trim(),
      code: code?.trim()
    }));
  }

  /**
   * Taxas brasileiras comuns
   */
  static IRRF(): Result<TaxRate, string> {
    return TaxRate.create(1.5, 'IRRF', 'IRRF');
  }

  static PIS(): Result<TaxRate, string> {
    return TaxRate.create(0.65, 'PIS', 'PIS');
  }

  static COFINS(): Result<TaxRate, string> {
    return TaxRate.create(3, 'COFINS', 'COFINS');
  }

  static CSLL(): Result<TaxRate, string> {
    return TaxRate.create(1, 'CSLL', 'CSLL');
  }

  static ISS(rate: number = 5): Result<TaxRate, string> {
    return TaxRate.create(rate, 'ISS', 'ISS');
  }

  /**
   * Calcula o valor do imposto sobre uma base
   */
  calculate(base: Money): Result<Money, string> {
    return base.multiply(this.asDecimal);
  }

  /**
   * Formata para exibição
   */
  format(): string {
    return `${this.props.name}: ${this.props.rate.toFixed(2)}%`;
  }

  toString(): string {
    return this.format();
  }
}

