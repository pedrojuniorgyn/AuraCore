import { describe, it, expect } from 'vitest';
import { ISCalculator } from '@/modules/fiscal/domain/tax/calculators/ISCalculator';
import { Money, Result } from '@/shared/domain';
import { Aliquota } from '@/modules/fiscal/domain/tax/value-objects/Aliquota';

describe('ISCalculator', () => {
  const calculator = new ISCalculator();

  describe('calculate', () => {
    it('deve calcular IS para bebidas alcoólicas', () => {
      const baseValue = Money.create(1000).value as any;
      const isRate = Aliquota.fromPercentage(25).value as any; // Exemplo: 25% para bebidas

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '22030000', // Bebidas alcoólicas
        productCategory: 'Bebidas Alcoólicas',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.isValue.value.amount).toBeCloseTo(250, 2);
        expect(calculationResult.ncmCode).toBe('22030000');
        expect(calculationResult.productCategory).toBe('Bebidas Alcoólicas');
      }
    });

    it('deve calcular IS para cigarros', () => {
      const baseValue = Money.create(1000).value as any;
      const isRate = Aliquota.fromPercentage(50).value as any; // Exemplo: 50% para cigarros

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '24020000', // Cigarros
        productCategory: 'Cigarros',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.isValue.value.amount).toBeCloseTo(500, 2);
      }
    });

    it('deve calcular IS para veículos', () => {
      const baseValue = Money.create(50000).value as any;
      const isRate = Aliquota.fromPercentage(10).value as any; // Exemplo: 10% para veículos

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '87030000', // Veículos
        productCategory: 'Veículos Automotores',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.isValue.value.amount).toBeCloseTo(5000, 2);
      }
    });

    it('deve retornar erro para base value negativa', () => {
      const baseValue = Money.create(-1000).value as any;
      const isRate = Aliquota.fromPercentage(25).value as any;

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '22030000',
        productCategory: 'Bebidas',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cannot be negative');
      }
    });

    it('deve retornar erro para NCM code inválido (não tem 8 dígitos)', () => {
      const baseValue = Money.create(1000).value as any;
      const isRate = Aliquota.fromPercentage(25).value as any;

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '220300', // Apenas 6 dígitos
        productCategory: 'Bebidas',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('NCM code');
      }
    });

    it('deve retornar erro para product category vazia', () => {
      const baseValue = Money.create(1000).value as any;
      const isRate = Aliquota.fromPercentage(25).value as any;

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '22030000',
        productCategory: '   ', // Apenas espaços
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('category is required');
      }
    });

    it('deve calcular IS com alíquota zero', () => {
      const baseValue = Money.create(1000).value as any;
      const isRate = Aliquota.fromPercentage(0).value as any;

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '22030000',
        productCategory: 'Bebidas',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.isValue.value.amount).toBe(0);
      }
    });

    it('deve calcular IS com base zero', () => {
      const baseValue = Money.create(0).value as any;
      const isRate = Aliquota.fromPercentage(25).value as any;

      const result = calculator.calculate({
        baseValue,
        isRate,
        ncmCode: '22030000',
        productCategory: 'Bebidas',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const calculationResult = result.value;
        expect(calculationResult.isValue.value.amount).toBe(0);
      }
    });
  });

  describe('isSubjectToIS', () => {
    it('deve identificar bebidas alcoólicas como sujeitas ao IS', () => {
      expect(ISCalculator.isSubjectToIS('22030000')).toBe(true);
      expect(ISCalculator.isSubjectToIS('22089999')).toBe(true);
    });

    it('deve identificar cigarros como sujeitos ao IS', () => {
      expect(ISCalculator.isSubjectToIS('24020000')).toBe(true);
      expect(ISCalculator.isSubjectToIS('24029999')).toBe(true);
    });

    it('deve identificar veículos como sujeitos ao IS', () => {
      expect(ISCalculator.isSubjectToIS('87030000')).toBe(true);
      expect(ISCalculator.isSubjectToIS('87039999')).toBe(true);
    });

    it('deve identificar minério de ferro como sujeito ao IS', () => {
      expect(ISCalculator.isSubjectToIS('26010000')).toBe(true);
    });

    it('deve identificar petróleo como sujeito ao IS', () => {
      expect(ISCalculator.isSubjectToIS('27090000')).toBe(true);
    });

    it('não deve identificar produtos comuns como sujeitos ao IS', () => {
      expect(ISCalculator.isSubjectToIS('12345678')).toBe(false);
      expect(ISCalculator.isSubjectToIS('00000000')).toBe(false);
      expect(ISCalculator.isSubjectToIS('99999999')).toBe(false);
    });
  });
});

