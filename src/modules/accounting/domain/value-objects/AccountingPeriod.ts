import { Result } from '@/shared/domain';

/**
 * Value Object: Período Contábil
 * 
 * Representa um mês/ano contábil com status de abertura/fechamento.
 * Imutável após criação.
 */
export interface AccountingPeriodProps {
  year: number;
  month: number; // 1-12
  isClosed: boolean;
  closedAt?: Date;
  closedBy?: string;
}

export class AccountingPeriod {
  private readonly _props: AccountingPeriodProps;

  private constructor(props: AccountingPeriodProps) {
    this._props = Object.freeze({ ...props });
  }

  // Getters
  get year(): number {
    return this._props.year;
  }

  get month(): number {
    return this._props.month;
  }

  get isClosed(): boolean {
    return this._props.isClosed;
  }

  get closedAt(): Date | undefined {
    return this._props.closedAt;
  }

  get closedBy(): string | undefined {
    return this._props.closedBy;
  }

  /**
   * Retorna período no formato YYYY-MM
   */
  get periodKey(): string {
    return `${this._props.year}-${this._props.month.toString().padStart(2, '0')}`;
  }

  /**
   * Retorna primeiro dia do período
   */
  get startDate(): Date {
    return new Date(this._props.year, this._props.month - 1, 1);
  }

  /**
   * Retorna último dia do período às 23:59:59.999
   * Garante que datas com horário no último dia sejam incluídas
   */
  get endDate(): Date {
    const lastDay = new Date(this._props.year, this._props.month, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  }

  /**
   * Verifica se uma data está dentro do período
   */
  containsDate(date: Date): boolean {
    const start = this.startDate;
    const end = this.endDate;
    return date >= start && date <= end;
  }

  /**
   * Factory method
   */
  static create(props: {
    year: number;
    month: number;
    isClosed?: boolean;
    closedAt?: Date;
    closedBy?: string;
  }): Result<AccountingPeriod, string> {
    // Validações
    if (!Number.isInteger(props.year) || props.year < 1900 || props.year > 2100) {
      return Result.fail('Year must be between 1900 and 2100');
    }

    if (!Number.isInteger(props.month) || props.month < 1 || props.month > 12) {
      return Result.fail('Month must be between 1 and 12');
    }

    return Result.ok(new AccountingPeriod({
      year: props.year,
      month: props.month,
      isClosed: props.isClosed ?? false,
      closedAt: props.closedAt,
      closedBy: props.closedBy,
    }));
  }

  /**
   * Cria período a partir de uma data
   */
  static fromDate(date: Date, isClosed = false): Result<AccountingPeriod, string> {
    return AccountingPeriod.create({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      isClosed,
    });
  }

  /**
   * Cria período atual
   */
  static current(): AccountingPeriod {
    const now = new Date();
    const result = AccountingPeriod.create({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isClosed: false,
    });
    // Safe porque validações passam para data atual
    return result.value!;
  }

  /**
   * Verifica igualdade
   */
  equals(other: AccountingPeriod): boolean {
    return this._props.year === other.year && this._props.month === other.month;
  }

  /**
   * Compara períodos (para ordenação)
   */
  compareTo(other: AccountingPeriod): number {
    if (this._props.year !== other.year) {
      return this._props.year - other.year;
    }
    return this._props.month - other.month;
  }

  /**
   * Retorna próximo período
   */
  next(): AccountingPeriod {
    const nextMonth = this._props.month === 12 ? 1 : this._props.month + 1;
    const nextYear = this._props.month === 12 ? this._props.year + 1 : this._props.year;
    
    const result = AccountingPeriod.create({
      year: nextYear,
      month: nextMonth,
      isClosed: false,
    });
    return result.value!;
  }

  /**
   * Retorna período anterior
   */
  previous(): AccountingPeriod {
    const prevMonth = this._props.month === 1 ? 12 : this._props.month - 1;
    const prevYear = this._props.month === 1 ? this._props.year - 1 : this._props.year;
    
    const result = AccountingPeriod.create({
      year: prevYear,
      month: prevMonth,
      isClosed: false,
    });
    return result.value!;
  }
}

