import { describe, it, expect } from 'vitest';
import { PISCalculator } from '@/modules/fiscal/domain/tax/calculators/PISCalculator';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects';
import { Money, Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('PISCalculator', () => {
  const calculator = new PISCalculator();

  it('should calculate PIS cumulativo (0.65%)', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'CUMULATIVO',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBeCloseTo(6.5);
    }
  });

  it('should calculate PIS não cumulativo (1.65%)', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'NAO_CUMULATIVO',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(16.5);
    }
  });

  it('should use custom aliquota when provided', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'CUMULATIVO',
      aliquota: Aliquota.fromPercentage(2).value!,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(20);
    }
  });

  it('should return zero for CST isento (04)', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '04',
      regime: 'CUMULATIVO',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(0);
    }
  });

  it('should fail with negative base value', () => {
    const result = calculator.calculate({
      baseValue: Money.create(-100).value!,
      cst: '01',
      regime: 'CUMULATIVO',
    });

    expect(Result.isFail(result)).toBe(true);
  });

  describe('getDefaultRate', () => {
    it('should return correct default rate for cumulativo', () => {
      const rate = expectOk(PISCalculator.getDefaultRate('CUMULATIVO'));
      expect(rate.percentual).toBe(0.65);
    });

    it('should return correct default rate for não cumulativo', () => {
      const rate = expectOk(PISCalculator.getDefaultRate('NAO_CUMULATIVO'));
      expect(rate.percentual).toBe(1.65);
    });
  });
});

