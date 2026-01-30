import { describe, it, expect } from 'vitest';
import { IPICalculator } from '@/modules/fiscal/domain/tax/calculators/IPICalculator';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects';
import { Money, Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('IPICalculator', () => {
  const calculator = new IPICalculator();

  it('should calculate IPI tributado', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cstIPI: '50',
      aliquota: Aliquota.fromPercentage(10).value!,
      isento: false,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(100);
    }
  });

  it('should return zero for isento', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cstIPI: '53',
      isento: true,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(0);
    }
  });

  it('should return zero for zero aliquota', () => {
    const result = calculator.calculate({
      baseValue: Money.create(1000).value!,
      cstIPI: '50',
      aliquota: expectOk(Aliquota.zero()),
      isento: false,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value.amount).toBe(0);
    }
  });

  it('should fail with negative base value', () => {
    const result = calculator.calculate({
      baseValue: Money.create(-100).value!,
      cstIPI: '50',
      aliquota: Aliquota.fromPercentage(10).value!,
      isento: false,
    });

    expect(Result.isFail(result)).toBe(true);
  });
});

