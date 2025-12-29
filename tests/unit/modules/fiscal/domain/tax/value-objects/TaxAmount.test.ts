import { describe, it, expect } from 'vitest';
import { TaxAmount } from '@/modules/fiscal/domain/tax/value-objects/TaxAmount';
import { BaseCalculo } from '@/modules/fiscal/domain/tax/value-objects/BaseCalculo';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects/Aliquota';
import { Money, Result } from '@/shared/domain';

describe('TaxAmount', () => {
  describe('calculate', () => {
    it('should calculate tax amount correctly', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.fromPercentage(18).value;

      if (base && aliquota) {
        const result = TaxAmount.calculate(base, aliquota);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.value.amount).toBe(180);
          expect(result.value.isValid).toBe(true);
        }
      }
    });

    it('should calculate zero tax for zero aliquota', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.zero();

      if (base) {
        const result = TaxAmount.calculate(base, aliquota);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.value.amount).toBe(0);
          expect(result.value.isZero).toBe(true);
        }
      }
    });

    it('should calculate with reduced base', () => {
      const value = Money.create(1000).value;
      const reduction = Aliquota.fromPercentage(20).value;
      const base = BaseCalculo.createWithReduction(value!, reduction!).value;
      const aliquota = Aliquota.fromPercentage(18).value;

      if (base && aliquota) {
        const result = TaxAmount.calculate(base, aliquota);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          // Base: 1000 - 20% = 800
          // Tax: 800 * 18% = 144
          expect(result.value.value.amount).toBe(144);
        }
      }
    });
  });

  describe('createWithValue', () => {
    it('should create with valid value', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.fromPercentage(18).value;
      const taxValue = Money.create(180).value;

      if (base && aliquota && taxValue) {
        const result = TaxAmount.createWithValue(taxValue, aliquota, base);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.isValid).toBe(true);
        }
      }
    });

    it('should fail with invalid value (outside tolerance)', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.fromPercentage(18).value;
      const taxValue = Money.create(200).value; // Expected: 180

      if (base && aliquota && taxValue) {
        const result = TaxAmount.createWithValue(taxValue, aliquota, base);

        expect(Result.isFail(result)).toBe(true);
      }
    });

    it('should accept value within tolerance (R$ 0.01)', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.fromPercentage(18).value;
      const taxValue = Money.create(180.01).value; // Expected: 180

      if (base && aliquota && taxValue) {
        const result = TaxAmount.createWithValue(taxValue, aliquota, base);

        expect(Result.isOk(result)).toBe(true);
      }
    });
  });

  describe('zero', () => {
    it('should create zero tax amount', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;

      if (base) {
        const taxAmount = TaxAmount.zero(base);

        expect(taxAmount.isZero).toBe(true);
        expect(taxAmount.value.amount).toBe(0);
      }
    });
  });

  describe('effectiveRate', () => {
    it('should calculate effective rate without reduction', () => {
      const value = Money.create(1000).value;
      const base = BaseCalculo.create(value!).value;
      const aliquota = Aliquota.fromPercentage(18).value;

      if (base && aliquota) {
        const taxAmount = TaxAmount.calculate(base, aliquota).value;

        if (taxAmount) {
          expect(taxAmount.effectiveRate.percentual).toBeCloseTo(18);
        }
      }
    });

    it('should calculate effective rate with reduction', () => {
      const value = Money.create(1000).value;
      const reduction = Aliquota.fromPercentage(20).value;
      const base = BaseCalculo.createWithReduction(value!, reduction!).value;
      const aliquota = Aliquota.fromPercentage(18).value;

      if (base && aliquota) {
        const taxAmount = TaxAmount.calculate(base, aliquota).value;

        if (taxAmount) {
          // Effective rate = 144 / 1000 = 14.4%
          expect(taxAmount.effectiveRate.percentual).toBeCloseTo(14.4);
        }
      }
    });
  });
});

