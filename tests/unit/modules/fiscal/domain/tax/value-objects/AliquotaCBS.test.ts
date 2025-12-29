import { describe, it, expect } from 'vitest';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';

describe('AliquotaCBS', () => {
  describe('fromPercentage', () => {
    it('should create valid aliquota CBS', () => {
      const result = AliquotaCBS.fromPercentage(8.8);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaCBS;
      expect(aliquota.percentual).toBe(8.8);
      expect(aliquota.decimal).toBeCloseTo(0.088);
      expect(aliquota.formatted).toBe('8.80%');
    });

    it('should create zero aliquota', () => {
      const result = AliquotaCBS.fromPercentage(0);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaCBS;
      expect(aliquota.percentual).toBe(0);
      expect(aliquota.isZero).toBe(true);
    });

    it('should fail with negative aliquota', () => {
      const result = AliquotaCBS.fromPercentage(-1);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot be negative');
    });

    it('should fail with aliquota above 100%', () => {
      const result = AliquotaCBS.fromPercentage(101);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot exceed 100%');
    });
  });

  describe('fromDecimal', () => {
    it('should create aliquota from decimal', () => {
      const result = AliquotaCBS.fromDecimal(0.088);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaCBS;
      expect(aliquota.percentual).toBeCloseTo(8.8);
    });
  });

  describe('applyTo', () => {
    it('should apply aliquota to money value', () => {
      const aliquota = AliquotaCBS.fromPercentage(8.8).value as AliquotaCBS;
      const baseValue = Money.create(1000, 'BRL').value as Money;

      const result = aliquota.applyTo(baseValue);

      expect(Result.isOk(result)).toBe(true);
      const taxValue = result.value as Money;
      expect(taxValue.amount).toBeCloseTo(88);
      expect(taxValue.currency).toBe('BRL');
    });
  });

  describe('test rate', () => {
    it('should identify test rate (0.9%)', () => {
      const aliquota = AliquotaCBS.fromPercentage(0.9).value as AliquotaCBS;
      expect(aliquota.isTestRate).toBe(true);
    });

    it('should create test rate via static method', () => {
      const aliquota = AliquotaCBS.testRate();
      expect(aliquota.percentual).toBe(0.9);
      expect(aliquota.isTestRate).toBe(true);
    });
  });

  describe('standard rate', () => {
    it('should identify standard rate (8.8%)', () => {
      const aliquota = AliquotaCBS.fromPercentage(8.8).value as AliquotaCBS;
      expect(aliquota.isStandardRate).toBe(true);
    });

    it('should create standard rate via static method', () => {
      const aliquota = AliquotaCBS.standardRate();
      expect(aliquota.percentual).toBe(8.8);
      expect(aliquota.isStandardRate).toBe(true);
    });
  });

  describe('static factories', () => {
    it('should create zero aliquota via static method', () => {
      const aliquota = AliquotaCBS.zero();
      expect(aliquota.percentual).toBe(0);
      expect(aliquota.isZero).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same percentual (with tolerance)', () => {
      const aliq1 = AliquotaCBS.fromPercentage(8.8).value as AliquotaCBS;
      const aliq2 = AliquotaCBS.fromPercentage(8.80).value as AliquotaCBS;

      expect(aliq1.equals(aliq2)).toBe(true);
    });

    it('should return false for different percentual', () => {
      const aliq1 = AliquotaCBS.fromPercentage(8.8).value as AliquotaCBS;
      const aliq2 = AliquotaCBS.fromPercentage(5.0).value as AliquotaCBS;

      expect(aliq1.equals(aliq2)).toBe(false);
    });
  });
});

