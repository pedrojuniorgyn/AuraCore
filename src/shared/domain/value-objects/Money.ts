import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface MoneyProps extends Record<string, unknown> {
  amount: number;
  currency: string;
}

/**
 * Value Object para valores monetários
 * 
 * Invariantes:
 * - Amount não pode ser NaN ou Infinity
 * - Currency deve ter 3 caracteres (ISO 4217)
 * - Operações entre moedas diferentes são proibidas
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  /**
   * Factory method - única forma de criar Money
   */
  static create(amount: number, currency: string = 'BRL'): Result<Money, string> {
    if (!Number.isFinite(amount)) {
      return Result.fail('Amount must be a finite number');
    }
    if (currency.length !== 3) {
      return Result.fail('Currency must be 3 characters (ISO 4217)');
    }
    return Result.ok(new Money({ amount, currency: currency.toUpperCase() }));
  }

  /**
   * Cria Money com valor zero
   */
  static zero(currency: string = 'BRL'): Money {
    return new Money({ amount: 0, currency: currency.toUpperCase() });
  }

  /**
   * Soma dois valores monetários
   */
  add(other: Money): Result<Money, string> {
    if (this.currency !== other.currency) {
      return Result.fail(`Cannot add ${this.currency} to ${other.currency}`);
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  /**
   * Subtrai dois valores monetários
   */
  subtract(other: Money): Result<Money, string> {
    if (this.currency !== other.currency) {
      return Result.fail(`Cannot subtract ${other.currency} from ${this.currency}`);
    }
    return Money.create(this.amount - other.amount, this.currency);
  }

  /**
   * Multiplica por um fator
   */
  multiply(factor: number): Result<Money, string> {
    if (!Number.isFinite(factor)) {
      return Result.fail('Factor must be a finite number');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  /**
   * Calcula percentual
   */
  percentage(percent: number): Result<Money, string> {
    if (!Number.isFinite(percent)) {
      return Result.fail('Percent must be a finite number');
    }
    return Money.create(this.amount * (percent / 100), this.currency);
  }

  /**
   * Verifica se é positivo
   */
  isPositive(): boolean {
    return this.amount > 0;
  }

  /**
   * Verifica se é negativo
   */
  isNegative(): boolean {
    return this.amount < 0;
  }

  /**
   * Verifica se é zero
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Verifica se é maior que outro
   */
  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare ${this.currency} with ${other.currency}`);
    }
    return this.amount > other.amount;
  }

  /**
   * Verifica se é menor que outro
   */
  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare ${this.currency} with ${other.currency}`);
    }
    return this.amount < other.amount;
  }

  /**
   * Formata para exibição (pt-BR)
   */
  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  /**
   * Converte para centavos (inteiro)
   */
  toCents(): number {
    return Math.round(this.amount * 100);
  }

  /**
   * Cria a partir de centavos
   */
  static fromCents(cents: number, currency: string = 'BRL'): Result<Money, string> {
    return Money.create(cents / 100, currency);
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

