import { describe, it, expect } from 'vitest';
import { CBSCalculator } from '@/modules/fiscal/domain/tax/calculators/CBSCalculator';
import { Money, Result } from '@/shared/domain';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

describe('CBSCalculator', () => {
  const calculator = new CBSCalculator();

  describe('calculate', () => {
    it('deve calcular CBS corretamente com alíquota padrão (8,8%)', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.baseCalculo.originalValue.amount).toBe(1000);
        expect(calculationResult.cbsValue.value.amount).toBeCloseTo(88, 2);
      }
    });

    it('deve calcular CBS corretamente no período de transição 2026 (0,9%)', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(0.9).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.cbsValue.value.amount).toBeCloseTo(9, 2);
      }
    });

    it('deve aplicar redução corretamente', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
        reductionRate: 30, // 30% de redução
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.baseCalculoEfetiva.originalValue.amount).toBe(700);
        expect(calculationResult.cbsValue.value.amount).toBeCloseTo(61.6, 2);
        expect(calculationResult.reductionRate).toBe(30);
      }
    });

    it('deve calcular diferimento corretamente', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
        deferralRate: 50, // 50% diferido
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.deferredValue?.amount).toBeCloseTo(44, 2);
        expect(calculationResult.deferralRate).toBe(50);
      }
    });

    it('deve retornar erro para base value negativa', () => {
      const baseValue = Money.create(-1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cannot be negative');
      }
    });

    it('deve retornar erro para reduction rate inválida', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
        reductionRate: 101, // Acima de 100%
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Reduction rate');
      }
    });

    it('deve retornar erro para deferral rate inválida', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
        deferralRate: -5, // Negativa
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Deferral rate');
      }
    });

    it('deve calcular CBS com alíquota zero', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(0).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.cbsValue.value.amount).toBe(0);
      }
    });

    it('deve calcular CBS com base zero', () => {
      const baseValue = Money.create(0).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.cbsValue.value.amount).toBe(0);
      }
    });

    it('deve aplicar redução e diferimento juntos', () => {
      const baseValue = Money.create(1000).value as Money & AliquotaCBS;
      const cbsRate = AliquotaCBS.fromPercentage(8.8).value as Money & AliquotaCBS;

      const result = calculator.calculate({
        baseValue,
        cbsRate,
        reductionRate: 50, // 50% de redução
        deferralRate: 100, // 100% diferido
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.baseCalculoEfetiva.originalValue.amount).toBe(500);
        expect(calculationResult.cbsValue.value.amount).toBeCloseTo(44, 2);
        expect(calculationResult.deferredValue?.amount).toBeCloseTo(44, 2);
      }
    });
  });
});

