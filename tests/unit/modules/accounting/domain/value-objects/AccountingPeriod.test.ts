import { describe, it, expect } from 'vitest';
import { AccountingPeriod } from '@/modules/accounting/domain/value-objects/AccountingPeriod';
import { Result } from '@/shared/domain';

describe('AccountingPeriod', () => {
  describe('create', () => {
    it('should create valid period', () => {
      const result = AccountingPeriod.create({
        year: 2025,
        month: 6,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.year).toBe(2025);
        expect(result.value.month).toBe(6);
        expect(result.value.isClosed).toBe(false);
        expect(result.value.periodKey).toBe('2025-06');
      }
    });

    it('should fail with invalid month', () => {
      const result = AccountingPeriod.create({
        year: 2025,
        month: 13,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid year', () => {
      const result = AccountingPeriod.create({
        year: 1800,
        month: 6,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('fromDate', () => {
    it('should create period from date', () => {
      const date = new Date('2025-03-15');
      const result = AccountingPeriod.fromDate(date);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.year).toBe(2025);
        expect(result.value.month).toBe(3);
      }
    });
  });

  describe('containsDate', () => {
    it('should return true for date within period', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      const date = new Date('2025-06-15');

      expect(period.containsDate(date)).toBe(true);
    });

    it('should return false for date outside period', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      // Usar construtor explícito para evitar problemas de timezone
      const date = new Date(2025, 6, 1); // 1º de julho (month=6 é julho em Date)

      expect(period.containsDate(date)).toBe(false);
    });
  });

  describe('next/previous', () => {
    it('should return next period', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      const next = period.next();

      expect(next.year).toBe(2025);
      expect(next.month).toBe(7);
    });

    it('should handle year transition for next', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 12 }).value!;
      const next = period.next();

      expect(next.year).toBe(2026);
      expect(next.month).toBe(1);
    });

    it('should return previous period', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      const prev = period.previous();

      expect(prev.year).toBe(2025);
      expect(prev.month).toBe(5);
    });

    it('should handle year transition for previous', () => {
      const period = AccountingPeriod.create({ year: 2025, month: 1 }).value!;
      const prev = period.previous();

      expect(prev.year).toBe(2024);
      expect(prev.month).toBe(12);
    });
  });

  describe('equals', () => {
    it('should return true for same period', () => {
      const p1 = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      const p2 = AccountingPeriod.create({ year: 2025, month: 6 }).value!;

      expect(p1.equals(p2)).toBe(true);
    });

    it('should return false for different period', () => {
      const p1 = AccountingPeriod.create({ year: 2025, month: 6 }).value!;
      const p2 = AccountingPeriod.create({ year: 2025, month: 7 }).value!;

      expect(p1.equals(p2)).toBe(false);
    });
  });
});

