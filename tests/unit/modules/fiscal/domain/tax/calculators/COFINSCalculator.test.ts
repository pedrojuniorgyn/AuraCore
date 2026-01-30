import { describe, it, expect } from 'vitest';
import { COFINSCalculator } from '@/modules/fiscal/domain/tax/calculators/COFINSCalculator';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects';
import { Money, Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('COFINSCalculator', () => {
  const calculator = new COFINSCalculator();

  it('should calculate COFINS cumulativo (3%)', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'CUMULATIVO',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(30);
    }
  });

  it('should calculate COFINS não cumulativo (7.6%)', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'NAO_CUMULATIVO',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(76);
    }
  });

  it('should use custom aliquota when provided', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cst: '01',
      regime: 'CUMULATIVO',
      aliquota: Aliquota.fromPercentage(5).value!,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(50);
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
      const rate = expectOk(COFINSCalculator.getDefaultRate('CUMULATIVO'));
      expect(rate.percentual).toBe(3.0);
    });

    it('should return correct default rate for não cumulativo', () => {
      const rate = expectOk(COFINSCalculator.getDefaultRate('NAO_CUMULATIVO'));
      expect(rate.percentual).toBe(7.6);
    });
  });
});

