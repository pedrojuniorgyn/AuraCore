/**
 * Time Intelligence Helper
 *
 * Implementa funções de Time Intelligence para análises temporais enterprise.
 * Suporta: YTD, MTD, QTD, YoY, MoM, QoQ
 *
 * Referência: SAP BW Time Characteristics, Oracle Time Dimension
 * @see GAP-Q02
 */

import { startOfYear, startOfMonth, startOfQuarter, subYears, subMonths, subQuarters, format } from 'date-fns';

export type TimePeriod = 'YTD' | 'MTD' | 'QTD' | 'CUSTOM';
export type ComparisonType = 'YoY' | 'MoM' | 'QoQ' | 'NONE';

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface TimeComparison {
  current: TimeRange;
  previous: TimeRange;
  comparisonType: ComparisonType;
}

export const TimeIntelligence = {
  /**
   * Get date range for a time period
   * @param period - Tipo de período (YTD, MTD, QTD, CUSTOM)
   * @param referenceDate - Data de referência (padrão: hoje)
   */
  getRange(period: TimePeriod, referenceDate: Date = new Date()): TimeRange {
    switch (period) {
      case 'YTD':
        return {
          start: startOfYear(referenceDate),
          end: referenceDate,
          label: `YTD ${format(referenceDate, 'yyyy')}`,
        };
      case 'MTD':
        return {
          start: startOfMonth(referenceDate),
          end: referenceDate,
          label: format(referenceDate, 'MMM yyyy'),
        };
      case 'QTD':
        return {
          start: startOfQuarter(referenceDate),
          end: referenceDate,
          label: `Q${Math.ceil((referenceDate.getMonth() + 1) / 3)} ${format(referenceDate, 'yyyy')}`,
        };
      default:
        return {
          start: startOfMonth(referenceDate),
          end: referenceDate,
          label: 'Custom',
        };
    }
  },

  /**
   * Get comparison ranges (current vs previous)
   * @param period - Tipo de período
   * @param comparison - Tipo de comparação (YoY, MoM, QoQ)
   * @param referenceDate - Data de referência
   */
  getComparison(period: TimePeriod, comparison: ComparisonType, referenceDate: Date = new Date()): TimeComparison {
    const current = this.getRange(period, referenceDate);
    let previousRef: Date;

    switch (comparison) {
      case 'YoY':
        previousRef = subYears(referenceDate, 1);
        break;
      case 'MoM':
        previousRef = subMonths(referenceDate, 1);
        break;
      case 'QoQ':
        previousRef = subQuarters(referenceDate, 1);
        break;
      default:
        previousRef = referenceDate;
    }

    return {
      current,
      previous: this.getRange(period, previousRef),
      comparisonType: comparison,
    };
  },

  /**
   * Calculate variance between two values
   * @param current - Valor atual
   * @param previous - Valor anterior
   * @returns Variação absoluta, percentual e tendência
   */
  calculateVariance(current: number, previous: number): {
    absolute: number;
    percentage: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  } {
    const absolute = current - previous;
    const percentage = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    const trend = absolute > 0.01 ? 'UP' : absolute < -0.01 ? 'DOWN' : 'STABLE';

    return { absolute, percentage, trend };
  },

  /**
   * Format SQL date for MSSQL
   * @param date - Data a ser formatada
   * @returns String no formato yyyy-MM-dd
   */
  toSQLDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  },

  /**
   * Get fiscal year start (configurable)
   * @param referenceDate - Data de referência
   * @param fiscalYearStartMonth - Mês de início do ano fiscal (1-12)
   * @returns Data de início do ano fiscal
   */
  getFiscalYearStart(referenceDate: Date, fiscalYearStartMonth: number = 1): Date {
    const year = referenceDate.getMonth() < fiscalYearStartMonth - 1
      ? referenceDate.getFullYear() - 1
      : referenceDate.getFullYear();
    return new Date(year, fiscalYearStartMonth - 1, 1);
  },
};
