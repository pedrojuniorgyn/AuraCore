/**
 * Value Object: Money
 * Representa valor monetário com currency
 *
 * Imutável - todas operações retornam nova instância
 *
 * @module shared/domain/value-objects
 */
import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface MoneyProps extends Record<string, unknown> {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  // Moedas suportadas (ISO 4217)
  static readonly SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
  static readonly DEFAULT_CURRENCY = 'BRL';

  // Zero em cada moeda (útil para inicializações)
  static readonly ZERO_BRL = new Money({ amount: 0, currency: 'BRL' });
  static readonly ZERO_USD = new Money({ amount: 0, currency: 'USD' });

  private constructor(props: MoneyProps) {
    super(props);
    Object.freeze(this);
  }

  // Getters
  get amount(): number { return this.props.amount; }
  get currency(): string { return this.props.currency; }

  // Computed - métodos para consistência com StockQuantity
  isZero(): boolean { return this.props.amount === 0; }
  isPositive(): boolean { return this.props.amount > 0; }
  isNegative(): boolean { return this.props.amount < 0; }

  /**
   * Factory method com validações
   */
  static create(amount: number, currency: string = Money.DEFAULT_CURRENCY): Result<Money, string> {
    // Validar amount (rejeita NaN, Infinity, -Infinity)
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return Result.fail('amount deve ser um número válido');
    }

    // Validar currency
    const normalizedCurrency = currency?.toUpperCase().trim();
    if (!normalizedCurrency) {
      return Result.fail('currency é obrigatório');
    }

    if (!Money.SUPPORTED_CURRENCIES.includes(normalizedCurrency as typeof Money.SUPPORTED_CURRENCIES[number])) {
      return Result.fail(
        `currency '${currency}' não suportada. Use: ${Money.SUPPORTED_CURRENCIES.join(', ')}`
      );
    }

    // Arredondar para 2 casas decimais (precisão monetária)
    const roundedAmount = Math.round(amount * 100) / 100;

    return Result.ok(new Money({
      amount: roundedAmount,
      currency: normalizedCurrency
    }));
  }

  /**
   * Criar a partir de centavos (útil para evitar floating point issues)
   */
  static fromCents(cents: number, currency: string = Money.DEFAULT_CURRENCY): Result<Money, string> {
    if (!Number.isInteger(cents)) {
      return Result.fail('cents deve ser um número inteiro');
    }
    return Money.create(cents / 100, currency);
  }

  /**
   * Reconstitute sem validações (para Mappers)
   */
  static reconstitute(amount: number, currency: string): Money {
    return new Money({ amount, currency });
  }

  /**
   * Cria Money com valor zero
   */
  static zero(currency: string = 'BRL'): Result<Money, string> {
    return Money.create(0, currency);
  }

  /**
   * Soma dois valores monetários
   * @throws Result.fail se currencies diferentes
   */
  add(other: Money): Result<Money, string> {
    if (this.currency !== other.currency) {
      return Result.fail(
        `Não é possível somar ${this.currency} com ${other.currency}. ` +
        `Converta para a mesma moeda primeiro.`
      );
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  /**
   * Subtrai dois valores monetários
   */
  subtract(other: Money): Result<Money, string> {
    if (this.currency !== other.currency) {
      return Result.fail(
        `Não é possível subtrair ${other.currency} de ${this.currency}. ` +
        `Converta para a mesma moeda primeiro.`
      );
    }
    return Money.create(this.amount - other.amount, this.currency);
  }

  /**
   * Multiplica por um fator (ex: quantidade)
   */
  multiply(factor: number): Result<Money, string> {
    if (typeof factor !== 'number' || isNaN(factor)) {
      return Result.fail('factor deve ser um número válido');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  /**
   * Divide por um divisor
   */
  divide(divisor: number): Result<Money, string> {
    if (typeof divisor !== 'number' || isNaN(divisor)) {
      return Result.fail('divisor deve ser um número válido');
    }
    if (divisor === 0) {
      return Result.fail('Divisão por zero não permitida');
    }
    return Money.create(this.amount / divisor, this.currency);
  }

  /**
   * Calcula percentual do valor
   */
  percentage(percent: number): Result<Money, string> {
    if (typeof percent !== 'number' || isNaN(percent)) {
      return Result.fail('percent deve ser um número válido');
    }
    return Money.create((this.amount * percent) / 100, this.currency);
  }

  /**
   * Retorna valor absoluto
   */
  abs(): Money {
    return new Money({
      amount: Math.abs(this.amount),
      currency: this.currency
    });
  }

  /**
   * Nega o valor (positivo → negativo, negativo → positivo)
   */
  negate(): Money {
    return new Money({
      amount: -this.amount,
      currency: this.currency
    });
  }

  /**
   * Converte para outra moeda usando taxa de câmbio
   */
  convertTo(targetCurrency: string, exchangeRate: number): Result<Money, string> {
    if (exchangeRate <= 0) {
      return Result.fail('exchangeRate deve ser positivo');
    }
    return Money.create(this.amount * exchangeRate, targetCurrency);
  }

  /**
   * Compara valores (retorna -1, 0, ou 1)
   */
  compare(other: Money): Result<number, string> {
    if (this.currency !== other.currency) {
      return Result.fail('Não é possível comparar currencies diferentes');
    }

    if (this.amount < other.amount) return Result.ok(-1);
    if (this.amount > other.amount) return Result.ok(1);
    return Result.ok(0);
  }

  /**
   * Verifica se é maior que outro valor
   * @throws Error se currencies diferentes
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  /**
   * Verifica se é menor que outro valor
   * @throws Error se currencies diferentes
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  /**
   * Verifica se é maior ou igual
   * @throws Error se currencies diferentes
   */
  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  /**
   * Verifica se é menor ou igual
   * @throws Error se currencies diferentes
   */
  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount <= other.amount;
  }

  /**
   * Garante que as currencies são iguais (uso interno)
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Não é possível comparar ${this.currency} com ${other.currency}. ` +
        `Converta para a mesma moeda primeiro.`
      );
    }
  }

  /**
   * Retorna valor em centavos (inteiro)
   */
  toCents(): number {
    return Math.round(this.amount * 100);
  }

  /**
   * Formata para exibição
   */
  format(locale: string = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  /**
   * Representação para debug
   */
  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  /**
   * Serializa para JSON (útil para APIs)
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }
}
