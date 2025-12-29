import { describe, it, expect } from 'vitest';
import { IBSCalculator } from '@/modules/fiscal/domain/tax/calculators/IBSCalculator';
import { Money, Result } from '@/shared/domain';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';

describe('IBSCalculator', () => {
  const calculator = new IBSCalculator();

  describe('calculate', () => {
    it('deve calcular IBS corretamente com alíquotas padrão', () => {
      const baseValue = Money.create(1000).value as Money;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as AliquotaIBS; // 50% de 17,7%
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as AliquotaIBS; // 50% de 17,7%

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        municipioCode: '3550308', // São Paulo
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.baseCalculo.originalValue.amount).toBe(1000);
        expect(calculationResult.ibsUfValue.value.amount).toBeCloseTo(88.5, 2);
        expect(calculationResult.ibsMunValue.value.amount).toBeCloseTo(88.5, 2);
        expect(calculationResult.totalIBS.amount).toBeCloseTo(177, 2);
      }
    });

    it('deve calcular IBS corretamente no período de transição 2026', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(0.05).value as any; // 0,1% dividido
      const ibsMunRate = AliquotaIBS.fromPercentage(0.05).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.totalIBS.amount).toBeCloseTo(1, 2);
      }
    });

    it('deve calcular IBS corretamente no período de transição 2029 (10%)', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(0.885).value as any; // 1,77% / 2
      const ibsMunRate = AliquotaIBS.fromPercentage(0.885).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'MG',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.totalIBS.amount).toBeCloseTo(17.7, 2);
      }
    });

    it('deve aplicar redução corretamente', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        reductionRate: 50, // 50% de redução
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.baseCalculoEfetiva.originalValue.amount).toBe(500);
        expect(calculationResult.totalIBS.amount).toBeCloseTo(88.5, 2); // 50% do valor sem redução
        expect(calculationResult.reductionRate).toBe(50);
      }
    });

    it('deve calcular diferimento corretamente', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        deferralRate: 100, // 100% diferido
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.deferredValue?.amount).toBeCloseTo(177, 2);
        expect(calculationResult.deferralRate).toBe(100);
      }
    });

    it('deve retornar erro para base value negativa', () => {
      const baseValue = Money.create(-1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cannot be negative');
      }
    });

    it('deve retornar erro para UF code inválido', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'S', // Apenas 1 dígito
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('UF code');
      }
    });

    it('deve retornar erro para município code inválido', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        municipioCode: '12345', // Apenas 5 dígitos (deve ter 7)
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('7 digits');
      }
    });

    it('deve retornar erro para reduction rate inválida', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        reductionRate: 150, // Acima de 100%
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Reduction rate');
      }
    });

    it('deve retornar erro para deferral rate inválida', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
        deferralRate: -10, // Negativa
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Deferral rate');
      }
    });

    it('deve calcular IBS com alíquota zero', () => {
      const baseValue = Money.create(1000).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(0).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(0).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.totalIBS.amount).toBe(0);
      }
    });

    it('deve calcular IBS com base zero', () => {
      const baseValue = Money.create(0).value as any;
      const ibsUfRate = AliquotaIBS.fromPercentage(8.85).value as any;
      const ibsMunRate = AliquotaIBS.fromPercentage(8.85).value as any;

      const result = calculator.calculate({
        baseValue,
        ibsUfRate,
        ibsMunRate,
        ufCode: 'SP',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.totalIBS.amount).toBe(0);
      }
    });
  });
});

