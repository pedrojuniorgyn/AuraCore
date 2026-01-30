import { describe, it, expect } from 'vitest';
import { BaseCalculo } from '@/modules/fiscal/domain/tax/value-objects/BaseCalculo';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects/Aliquota';
import { Money, Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('BaseCalculo', () => {
  describe('create', () => {
    it('should create base de cálculo without reduction', () => {
      const value = Money.create(1000).value;

      if (value) {
        const result = BaseCalculo.create(value);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.originalValue.amount).toBe(1000);
          expect(result.value.reducedValue.amount).toBe(1000);
          expect(result.value.hasReduction).toBe(false);
        }
      }
    });

    it('should fail with negative value', () => {
      const value = Money.create(-100).value;

      if (value) {
        const result = BaseCalculo.create(value);

        expect(Result.isFail(result)).toBe(true);
      }
    });
  });

  describe('createWithReduction', () => {
    it('should create base de cálculo with reduction', () => {
      const value = Money.create(1000).value;
      const reduction = Aliquota.fromPercentage(20).value;

      if (value && reduction) {
        const result = BaseCalculo.createWithReduction(value, reduction);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.originalValue.amount).toBe(1000);
          expect(result.value.reducedValue.amount).toBe(800);
          expect(result.value.hasReduction).toBe(true);
          expect(expectOk(result.value.getReductionAmount()).amount).toBe(200);
        }
      }
    });

    it('should fail with reduction > 100%', () => {
      const value = Money.create(1000).value;
      const reduction = Aliquota.fromPercentage(150).value;

      if (value && reduction) {
        const result = BaseCalculo.createWithReduction(value, reduction);

        expect(Result.isFail(result)).toBe(true);
      }
    });

    it('should handle zero reduction', () => {
      const value = Money.create(1000).value;
      const reduction = expectOk(Aliquota.zero());

      if (value) {
        const result = BaseCalculo.createWithReduction(value, reduction);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.reducedValue.amount).toBe(1000);
          expect(result.value.hasReduction).toBe(false);
        }
      }
    });
  });

  describe('equals', () => {
    it('should be equal for same values without reduction', () => {
      const value = Money.create(1000).value;

      if (value) {
        const base1 = BaseCalculo.create(value).value;
        const base2 = BaseCalculo.create(value).value;

        if (base1 && base2) {
          expect(base1.equals(base2)).toBe(true);
        }
      }
    });

    it('should be equal for same values with same reduction', () => {
      const value = Money.create(1000).value;
      const reduction = Aliquota.fromPercentage(20).value;

      if (value && reduction) {
        const base1 = BaseCalculo.createWithReduction(value, reduction).value;
        const base2 = BaseCalculo.createWithReduction(value, reduction).value;

        if (base1 && base2) {
          expect(base1.equals(base2)).toBe(true);
        }
      }
    });

    it('should not be equal for different values', () => {
      const value1 = Money.create(1000).value;
      const value2 = Money.create(2000).value;

      if (value1 && value2) {
        const base1 = BaseCalculo.create(value1).value;
        const base2 = BaseCalculo.create(value2).value;

        if (base1 && base2) {
          expect(base1.equals(base2)).toBe(false);
        }
      }
    });
  });
});

