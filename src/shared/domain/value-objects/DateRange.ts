import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface DateRangeProps extends Record<string, unknown> {
  start: Date;
  end: Date;
}

/**
 * Value Object para intervalo de datas
 * 
 * Invariantes:
 * - Start deve ser anterior ou igual a End
 * - Datas devem ser válidas
 */
export class DateRange extends ValueObject<DateRangeProps> {
  private constructor(props: DateRangeProps) {
    super(props);
  }

  get start(): Date {
    return this.props.start;
  }

  get end(): Date {
    return this.props.end;
  }

  /**
   * Factory method
   */
  static create(start: Date, end: Date): Result<DateRange, string> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return Result.fail('Invalid start date');
    }

    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return Result.fail('Invalid end date');
    }

    if (start > end) {
      return Result.fail('Start date must be before or equal to end date');
    }

    return Result.ok(new DateRange({ start, end }));
  }

  /**
   * Cria DateRange a partir de strings ISO
   */
  static fromStrings(start: string, end: string): Result<DateRange, string> {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return DateRange.create(startDate, endDate);
  }

  /**
   * Retorna duração em dias
   */
  get durationInDays(): number {
    const diffTime = this.props.end.getTime() - this.props.start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Retorna duração em meses (aproximado)
   */
  get durationInMonths(): number {
    const months = (this.props.end.getFullYear() - this.props.start.getFullYear()) * 12;
    return months + this.props.end.getMonth() - this.props.start.getMonth();
  }

  /**
   * Verifica se uma data está dentro do intervalo
   */
  contains(date: Date): boolean {
    return date >= this.props.start && date <= this.props.end;
  }

  /**
   * Verifica se dois intervalos se sobrepõem
   */
  overlaps(other: DateRange): boolean {
    return this.props.start <= other.end && this.props.end >= other.start;
  }

  /**
   * Verifica se este intervalo contém completamente outro
   */
  encompasses(other: DateRange): boolean {
    return this.props.start <= other.start && this.props.end >= other.end;
  }

  /**
   * Formata para exibição
   */
  format(locale: string = 'pt-BR'): string {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${formatter.format(this.props.start)} - ${formatter.format(this.props.end)}`;
  }

  toString(): string {
    return this.format();
  }
}

