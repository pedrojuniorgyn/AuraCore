import { describe, it, expect } from 'vitest';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects/Aliquota';
import { Money, Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('Aliquota', () => {
  describe('fromPercentage', () => {
    it('should create valid aliquota from percentage', () => {
      const result = Aliquota.fromPercentage(18);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.percentual).toBe(18);
        expect(result.value.decimal).toBeCloseTo(0.18);
      }
    });

    it('should create zero aliquota', () => {
      const result = Aliquota.fromPercentage(0);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isZero).toBe(true);
      }
    });

    it('should fail with negative aliquota', () => {
      const result = Aliquota.fromPercentage(-5);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with aliquota > 300%', () => {
      const result = Aliquota.fromPercentage(350);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should accept aliquotas above 100% (IPI)', () => {
      const result = Aliquota.fromPercentage(150);

      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('fromDecimal', () => {
    it('should create aliquota from decimal', () => {
      const result = Aliquota.fromDecimal(0.18);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.percentual).toBe(18);
      }
    });
  });

  describe('zero', () => {
    it('should create zero aliquota', () => {
      const aliquota = expectOk(Aliquota.zero());

      expect(aliquota.isZero).toBe(true);
      expect(aliquota.percentual).toBe(0);
    });
  });

  describe('applyTo', () => {
    it('should apply aliquota to value', () => {
      const aliquota = Aliquota.fromPercentage(18).value;
      const value = Money.create(1000).value;

      if (aliquota && value) {
        const result = aliquota.applyTo(value);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.amount).toBe(180);
        }
      }
    });

    it('should apply zero aliquota', () => {
      const aliquota = expectOk(Aliquota.zero());
      const value = expectOk(Money.create(1000));

      const result = expectOk(aliquota.applyTo(value));
      expect(result.amount).toBe(0);
    });
  });

  describe('formatted', () => {
    it('should format aliquota correctly', () => {
      const aliquota = Aliquota.fromPercentage(18.5).value;

      if (aliquota) {
        expect(aliquota.formatted).toBe('18.50%');
      }
    });
  });

  describe('equals', () => {
    it('should be equal for same aliquotas', () => {
      const aliquota1 = Aliquota.fromPercentage(18).value;
      const aliquota2 = Aliquota.fromPercentage(18).value;

      if (aliquota1 && aliquota2) {
        expect(aliquota1.equals(aliquota2)).toBe(true);
      }
    });

    it('should not be equal for different aliquotas', () => {
      const aliquota1 = Aliquota.fromPercentage(18).value;
      const aliquota2 = Aliquota.fromPercentage(12).value;

      if (aliquota1 && aliquota2) {
        expect(aliquota1.equals(aliquota2)).toBe(false);
      }
    });

    it('should be equal with tolerance of 0.01%', () => {
      const aliquota1 = Aliquota.fromPercentage(18.001).value;
      const aliquota2 = Aliquota.fromPercentage(18.002).value;

      if (aliquota1 && aliquota2) {
        expect(aliquota1.equals(aliquota2)).toBe(true);
      }
    });
  });
});

