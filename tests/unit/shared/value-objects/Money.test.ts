import { describe, it, expect } from 'vitest';
import { Money } from '@/shared/domain/value-objects/Money';
import { Result } from '@/shared/domain/types/Result';

describe('Money', () => {
  describe('create', () => {
    it('should create valid Money with default currency BRL', () => {
      const result = Money.create(100);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(100);
        expect(result.value.currency).toBe('BRL');
      }
    });

    it('should create valid Money with specified currency', () => {
      const result = Money.create(100, 'USD');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.currency).toBe('USD');
      }
    });

    it('should uppercase currency', () => {
      const result = Money.create(100, 'usd');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.currency).toBe('USD');
      }
    });

    it('should fail with NaN amount', () => {
      const result = Money.create(NaN);
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with Infinity amount', () => {
      const result = Money.create(Infinity);
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid currency length', () => {
      const result = Money.create(100, 'EURO');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should allow negative amounts', () => {
      const result = Money.create(-50);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(-50);
      }
    });

    it('should allow zero amount', () => {
      const result = Money.create(0);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(0);
      }
    });
  });

  describe('zero', () => {
    it('should create Money with zero amount', () => {
      const result = Money.zero();
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(0);
        expect(result.value.currency).toBe('BRL');
      }
    });

    it('should create zero with specified currency', () => {
      const result = Money.zero('USD');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.currency).toBe('USD');
      }
    });

    it('should fail with invalid currency', () => {
      const result = Money.zero('INVALID');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two Money with same currency', () => {
      const m1Result = Money.create(100);
      const m2Result = Money.create(50);
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        const result = m1Result.value.add(m2Result.value);
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(150);
        }
      }
    });

    it('should fail when adding different currencies', () => {
      const m1Result = Money.create(100, 'BRL');
      const m2Result = Money.create(50, 'USD');
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        const result = m1Result.value.add(m2Result.value);
        expect(Result.isFail(result)).toBe(true);
      }
    });
  });

  describe('subtract', () => {
    it('should subtract two Money with same currency', () => {
      const m1Result = Money.create(100);
      const m2Result = Money.create(30);
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        const result = m1Result.value.subtract(m2Result.value);
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(70);
        }
      }
    });

    it('should allow negative result', () => {
      const m1Result = Money.create(30);
      const m2Result = Money.create(100);
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        const result = m1Result.value.subtract(m2Result.value);
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(-70);
        }
      }
    });
  });

  describe('multiply', () => {
    it('should multiply by factor', () => {
      const moneyResult = Money.create(100);
      if (Result.isOk(moneyResult)) {
        const result = moneyResult.value.multiply(2.5);
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(250);
        }
      }
    });

    it('should fail with NaN factor', () => {
      const moneyResult = Money.create(100);
      if (Result.isOk(moneyResult)) {
        const result = moneyResult.value.multiply(NaN);
        expect(Result.isFail(result)).toBe(true);
      }
    });
  });

  describe('percentage', () => {
    it('should calculate 10%', () => {
      const moneyResult = Money.create(100);
      if (Result.isOk(moneyResult)) {
        const result = moneyResult.value.percentage(10);
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(10);
        }
      }
    });
  });

  describe('comparison methods', () => {
    it('isPositive should return true for positive amount', () => {
      const moneyResult = Money.create(100);
      if (Result.isOk(moneyResult)) {
        expect(moneyResult.value.isPositive()).toBe(true);
      }
    });

    it('isNegative should return true for negative amount', () => {
      const moneyResult = Money.create(-100);
      if (Result.isOk(moneyResult)) {
        expect(moneyResult.value.isNegative()).toBe(true);
      }
    });

    it('isZero should return true for zero amount', () => {
      const result = Money.zero();
      if (Result.isOk(result)) {
        expect(result.value.isZero()).toBe(true);
      }
    });
  });

  describe('cents conversion', () => {
    it('toCents should convert to integer cents', () => {
      const moneyResult = Money.create(12.34);
      if (Result.isOk(moneyResult)) {
        expect(moneyResult.value.toCents()).toBe(1234);
      }
    });

    it('fromCents should create from cents', () => {
      const result = Money.fromCents(1234);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(12.34);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal Money', () => {
      const m1Result = Money.create(100, 'BRL');
      const m2Result = Money.create(100, 'BRL');
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        expect(m1Result.value.equals(m2Result.value)).toBe(true);
      }
    });

    it('should return false for different amounts', () => {
      const m1Result = Money.create(100);
      const m2Result = Money.create(200);
      if (Result.isOk(m1Result) && Result.isOk(m2Result)) {
        expect(m1Result.value.equals(m2Result.value)).toBe(false);
      }
    });
  });
});

