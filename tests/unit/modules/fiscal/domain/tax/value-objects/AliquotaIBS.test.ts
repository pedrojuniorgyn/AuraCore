import { describe, it, expect } from 'vitest';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('AliquotaIBS', () => {
  describe('fromPercentage', () => {
    it('should create valid aliquota IBS', () => {
      const result = AliquotaIBS.fromPercentage(17.7);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaIBS;
      expect(aliquota.percentual).toBe(17.7);
      expect(aliquota.decimal).toBeCloseTo(0.177);
      expect(aliquota.formatted).toBe('17.70%');
    });

    it('should create zero aliquota', () => {
      const result = AliquotaIBS.fromPercentage(0);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaIBS;
      expect(aliquota.percentual).toBe(0);
      expect(aliquota.isZero).toBe(true);
    });

    it('should fail with negative aliquota', () => {
      const result = AliquotaIBS.fromPercentage(-1);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot be negative');
    });

    it('should fail with aliquota above 100%', () => {
      const result = AliquotaIBS.fromPercentage(101);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot exceed 100%');
    });
  });

  describe('fromDecimal', () => {
    it('should create aliquota from decimal', () => {
      const result = AliquotaIBS.fromDecimal(0.177);

      expect(Result.isOk(result)).toBe(true);
      const aliquota = result.value as AliquotaIBS;
      expect(aliquota.percentual).toBeCloseTo(17.7);
    });
  });

  describe('applyTo', () => {
    it('should apply aliquota to money value', () => {
      const aliquota = AliquotaIBS.fromPercentage(17.7).value as AliquotaIBS;
      const baseValue = Money.create(1000, 'BRL').value as Money;

      const result = aliquota.applyTo(baseValue);

      expect(Result.isOk(result)).toBe(true);
      const taxValue = result.value as Money;
      expect(taxValue.amount).toBeCloseTo(177);
      expect(taxValue.currency).toBe('BRL');
    });
  });

  describe('test rate', () => {
    it('should identify test rate (0.1%)', () => {
      const aliquota = AliquotaIBS.fromPercentage(0.1).value as AliquotaIBS;
      expect(aliquota.isTestRate).toBe(true);
    });

    it('should create test rate via static method', () => {
      const aliquota = expectOk(AliquotaIBS.testRate());
      expect(aliquota.percentual).toBe(0.1);
      expect(aliquota.isTestRate).toBe(true);
    });
  });

  describe('standard rate', () => {
    it('should identify standard rate (17.7%)', () => {
      const aliquota = AliquotaIBS.fromPercentage(17.7).value as AliquotaIBS;
      expect(aliquota.isStandardRate).toBe(true);
    });

    it('should create standard rate via static method', () => {
      const aliquota = expectOk(AliquotaIBS.standardRate());
      expect(aliquota.percentual).toBe(17.7);
      expect(aliquota.isStandardRate).toBe(true);
    });
  });

  describe('static factories', () => {
    it('should create zero aliquota via static method', () => {
      const aliquota = expectOk(AliquotaIBS.zero());
      expect(aliquota.percentual).toBe(0);
      expect(aliquota.isZero).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same percentual (with tolerance)', () => {
      const aliq1 = AliquotaIBS.fromPercentage(17.7).value as AliquotaIBS;
      const aliq2 = AliquotaIBS.fromPercentage(17.70).value as AliquotaIBS;

      expect(aliq1.equals(aliq2)).toBe(true);
    });

    it('should return false for different percentual', () => {
      const aliq1 = AliquotaIBS.fromPercentage(17.7).value as AliquotaIBS;
      const aliq2 = AliquotaIBS.fromPercentage(10.0).value as AliquotaIBS;

      expect(aliq1.equals(aliq2)).toBe(false);
    });
  });
});

