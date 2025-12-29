import { describe, it, expect } from 'vitest';
import { ICMSCalculator } from '@/modules/fiscal/domain/tax/calculators/ICMSCalculator';
import { CST, CSOSN, Aliquota } from '@/modules/fiscal/domain/tax/value-objects';
import { Money, Result } from '@/shared/domain';

describe('ICMSCalculator', () => {
  const calculator = new ICMSCalculator();

  describe('Regime Normal', () => {
    it('should calculate ICMS tributado normal (CST 000)', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('000').value!,
        aliquota: Aliquota.fromPercentage(18).value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.valor.value.amount).toBe(180);
        expect(result.value.totalICMS.amount).toBe(180);
      }
    });

    it('should calculate ICMS with reduction (CST 020)', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('020').value!,
        aliquota: Aliquota.fromPercentage(18).value!,
        reductionRate: Aliquota.fromPercentage(20).value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Base: 1000 - 20% = 800
        // ICMS: 800 * 18% = 144
        expect(result.value.baseCalculo.reducedValue.amount).toBe(800);
        expect(result.value.valor.value.amount).toBe(144);
      }
    });

    it('should return zero for isento (CST 040)', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('040').value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.valor.value.amount).toBe(0);
      }
    });

    it('should return zero for diferido (CST 051)', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('051').value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.valor.value.amount).toBe(0);
      }
    });

    it('should calculate ICMS with ST (CST 010)', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('010').value!,
        aliquota: Aliquota.fromPercentage(18).value!,
        aliquotaST: Aliquota.fromPercentage(18).value!,
        mva: 30, // MVA de 30%
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // ICMS normal: 1000 * 18% = 180
        // Base ST: 1000 * (1 + 30%) = 1300
        // ICMS ST: 1300 * 18% = 234
        expect(result.value.valor.value.amount).toBe(180);
        expect(result.value.valorST?.value.amount).toBe(234);
        expect(result.value.totalICMS.amount).toBeCloseTo(414); // 180 + 234
      }
    });

    it('should fail without aliquota for tributado', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        cst: CST.create('000').value!,
        isInterstate: false,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('Simples Nacional', () => {
    it('should calculate credit for CSOSN 101', () => {
      const result = calculator.calculate({
        regime: 'SIMPLES_NACIONAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        csosn: CSOSN.create('101').value!,
        creditAliquota: Aliquota.fromPercentage(3).value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.creditValue?.value.amount).toBe(30);
        expect(result.value.totalICMS.amount).toBe(30);
      }
    });

    it('should return zero for CSOSN 102 (sem crédito)', () => {
      const result = calculator.calculate({
        regime: 'SIMPLES_NACIONAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        csosn: CSOSN.create('102').value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.valor.value.amount).toBe(0);
      }
    });

    it('should return zero for CSOSN 300 (imune)', () => {
      const result = calculator.calculate({
        regime: 'SIMPLES_NACIONAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        csosn: CSOSN.create('300').value!,
        isInterstate: false,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.valor.value.amount).toBe(0);
      }
    });

    it('should fail without credit aliquota for CSOSN 101', () => {
      const result = calculator.calculate({
        regime: 'SIMPLES_NACIONAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        csosn: CSOSN.create('101').value!,
        isInterstate: false,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should fail with negative base value', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(-100).value!,
        cst: CST.create('000').value!,
        aliquota: Aliquota.fromPercentage(18).value!,
        isInterstate: false,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without CST for regime normal', () => {
      const result = calculator.calculate({
        regime: 'NORMAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        isInterstate: false,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without CSOSN for Simples Nacional', () => {
      const result = calculator.calculate({
        regime: 'SIMPLES_NACIONAL',
        operationType: 'EXIT',
        baseValue: Money.create(1000).value!,
        isInterstate: false,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });
});

