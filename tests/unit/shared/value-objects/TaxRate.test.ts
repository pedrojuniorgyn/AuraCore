import { describe, it, expect } from 'vitest';
import { TaxRate } from '@/shared/domain/value-objects/TaxRate';
import { Money } from '@/shared/domain/value-objects/Money';
import { Result } from '@/shared/domain/types/Result';

describe('TaxRate', () => {
  describe('create', () => {
    it('should create valid TaxRate', () => {
      const result = TaxRate.create(1.5, 'IRRF', 'IRRF');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(1.5);
        expect(result.value.name).toBe('IRRF');
        expect(result.value.code).toBe('IRRF');
      }
    });

    it('should allow zero rate', () => {
      const result = TaxRate.create(0, 'Isento');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should allow 100% rate', () => {
      const result = TaxRate.create(100, 'Total');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail with negative rate', () => {
      const result = TaxRate.create(-1, 'Invalid');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with rate > 100', () => {
      const result = TaxRate.create(101, 'Invalid');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with empty name', () => {
      const result = TaxRate.create(1.5, '');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with whitespace only name', () => {
      const result = TaxRate.create(1.5, '   ');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should trim name and code', () => {
      const result = TaxRate.create(1.5, '  IRRF  ', '  IRRF  ');
      if (Result.isOk(result)) {
        expect(result.value.name).toBe('IRRF');
        expect(result.value.code).toBe('IRRF');
      }
    });

    it('should allow undefined code', () => {
      const result = TaxRate.create(1.5, 'Custom Tax');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBeUndefined();
      }
    });

    it('should fail with NaN rate', () => {
      const result = TaxRate.create(NaN, 'Invalid');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('asDecimal', () => {
    it('should convert to decimal', () => {
      const result = TaxRate.create(1.5, 'IRRF');
      if (Result.isOk(result)) {
        expect(result.value.asDecimal).toBe(0.015);
      }
    });

    it('should handle 100%', () => {
      const result = TaxRate.create(100, 'Total');
      if (Result.isOk(result)) {
        expect(result.value.asDecimal).toBe(1);
      }
    });
  });

  describe('static factories', () => {
    it('should create IRRF with 1.5%', () => {
      const result = TaxRate.IRRF();
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(1.5);
        expect(result.value.code).toBe('IRRF');
      }
    });

    it('should create PIS with 0.65%', () => {
      const result = TaxRate.PIS();
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(0.65);
      }
    });

    it('should create COFINS with 3%', () => {
      const result = TaxRate.COFINS();
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(3);
      }
    });

    it('should create CSLL with 1%', () => {
      const result = TaxRate.CSLL();
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(1);
      }
    });

    it('should create ISS with default 5%', () => {
      const result = TaxRate.ISS();
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(5);
      }
    });

    it('should create ISS with custom rate', () => {
      const result = TaxRate.ISS(2);
      if (Result.isOk(result)) {
        expect(result.value.rate).toBe(2);
      }
    });
  });

  describe('calculate', () => {
    it('should calculate tax on Money', () => {
      const taxResult = TaxRate.create(10, 'Test');
      const moneyResult = Money.create(1000);
      
      if (Result.isOk(taxResult) && Result.isOk(moneyResult)) {
        const calcResult = taxResult.value.calculate(moneyResult.value);
        if (Result.isOk(calcResult)) {
          expect(calcResult.value.amount).toBe(100);
        }
      }
    });

    it('should calculate IRRF correctly', () => {
      const taxResult = TaxRate.IRRF();
      const moneyResult = Money.create(10000);
      
      if (Result.isOk(taxResult) && Result.isOk(moneyResult)) {
        const calcResult = taxResult.value.calculate(moneyResult.value);
        if (Result.isOk(calcResult)) {
          expect(calcResult.value.amount).toBe(150);
        }
      }
    });
  });

  describe('format', () => {
    it('should format correctly', () => {
      const result = TaxRate.create(1.5, 'IRRF');
      if (Result.isOk(result)) {
        expect(result.value.format()).toBe('IRRF: 1.50%');
      }
    });

    it('should format with two decimal places', () => {
      const result = TaxRate.create(0.65, 'PIS');
      if (Result.isOk(result)) {
        expect(result.value.format()).toBe('PIS: 0.65%');
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal TaxRates', () => {
      const r1 = TaxRate.create(1.5, 'IRRF', 'IRRF');
      const r2 = TaxRate.create(1.5, 'IRRF', 'IRRF');
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(true);
      }
    });

    it('should return false for different rates', () => {
      const r1 = TaxRate.create(1.5, 'IRRF');
      const r2 = TaxRate.create(3, 'COFINS');
      if (Result.isOk(r1) && Result.isOk(r2)) {
        expect(r1.value.equals(r2.value)).toBe(false);
      }
    });
  });
});

