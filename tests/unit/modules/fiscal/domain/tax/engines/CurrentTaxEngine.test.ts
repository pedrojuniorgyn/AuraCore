import { describe, it, expect } from 'vitest';
import { CurrentTaxEngine } from '@/modules/fiscal/domain/tax/engines/CurrentTaxEngine';
import { CST, Aliquota } from '@/modules/fiscal/domain/tax/value-objects';
import { Money, Result } from '@/shared/domain';

describe('CurrentTaxEngine', () => {
  const engine = new CurrentTaxEngine();

  describe('calculateICMS', () => {
    it('should delegate to ICMSCalculator', () => {
      const result = engine.calculateICMS({
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
      }
    });
  });

  describe('calculateIPI', () => {
    it('should delegate to IPICalculator', () => {
      const result = engine.calculateIPI({
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
  });

  describe('calculatePIS', () => {
    it('should delegate to PISCalculator', () => {
      const result = engine.calculatePIS({
        baseValue: Money.create(1000).value!,
        cst: '01',
        regime: 'CUMULATIVO',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value.amount).toBeCloseTo(6.5);
      }
    });
  });

  describe('calculateCOFINS', () => {
    it('should delegate to COFINSCalculator', () => {
      const result = engine.calculateCOFINS({
        baseValue: Money.create(1000).value!,
        cst: '01',
        regime: 'CUMULATIVO',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.value.amount).toBe(30);
      }
    });
  });

  describe('calculateAll', () => {
    it('should calculate multiple taxes', () => {
      const result = engine.calculateAll({
        icms: {
          regime: 'NORMAL',
          operationType: 'EXIT',
          baseValue: Money.create(1000).value!,
          cst: CST.create('000').value!,
          aliquota: Aliquota.fromPercentage(18).value!,
          isInterstate: false,
        },
        pis: {
          baseValue: Money.create(1000).value!,
          cst: '01',
          regime: 'CUMULATIVO',
        },
        cofins: {
          baseValue: Money.create(1000).value!,
          cst: '01',
          regime: 'CUMULATIVO',
        },
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.icms).toBeDefined();
        expect(result.value.pis).toBeDefined();
        expect(result.value.cofins).toBeDefined();
        // Total: 180 (ICMS) + 6.5 (PIS) + 30 (COFINS) = 216.5
        expect(result.value.totalTaxes.amount).toBeCloseTo(216.5);
      }
    });
  });
});

