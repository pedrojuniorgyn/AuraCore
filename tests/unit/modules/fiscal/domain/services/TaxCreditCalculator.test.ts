/**
 * Testes para TaxCreditCalculator
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { TaxCreditCalculator, TaxCreditCalculationError } from '@/modules/fiscal/domain/services/TaxCreditCalculator';
import { TaxRate } from '@/modules/fiscal/domain/value-objects/TaxRate';
import type { FiscalDocumentData } from '@/modules/fiscal/domain/services/TaxCreditCalculator';

describe('TaxCreditCalculator', () => {
  let calculator: TaxCreditCalculator;

  beforeEach(() => {
    calculator = new TaxCreditCalculator();
  });

  describe('calculate', () => {
    it('should calculate PIS/COFINS credit for inbound document (CFOP 1xxx)', () => {
      const moneyResult = Money.create(1000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(1),
        netAmount: moneyResult.value,
        cfop: '1102',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const credit = result.value;
        expect(credit.pisCredit.amount).toBeCloseTo(16.5); // 1.65% de 1000
        expect(credit.cofinsCredit.amount).toBeCloseTo(76); // 7.6% de 1000
        // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
        const totalCreditResult = credit.getTotalCredit();
        expect(Result.isOk(totalCreditResult)).toBe(true);
        expect(totalCreditResult.value.amount).toBeCloseTo(92.5); // 9.25% de 1000
      }
    });

    it('should calculate PIS/COFINS credit for inbound document (CFOP 2xxx)', () => {
      const moneyResult = Money.create(5000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(2),
        netAmount: moneyResult.value,
        cfop: '2102',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const credit = result.value;
        expect(credit.pisCredit.amount).toBeCloseTo(82.5); // 1.65% de 5000
        expect(credit.cofinsCredit.amount).toBeCloseTo(380); // 7.6% de 5000
        // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
        const totalCreditResult = credit.getTotalCredit();
        expect(Result.isOk(totalCreditResult)).toBe(true);
        expect(totalCreditResult.value.amount).toBeCloseTo(462.5); // 9.25% de 5000
      }
    });

    it('should calculate PIS/COFINS credit for inbound document (CFOP 3xxx)', () => {
      const moneyResult = Money.create(2000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(3),
        netAmount: moneyResult.value,
        cfop: '3102',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const credit = result.value;
        // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
        const totalCreditResult = credit.getTotalCredit();
        expect(Result.isOk(totalCreditResult)).toBe(true);
        expect(totalCreditResult.value.amount).toBeCloseTo(185); // 9.25% de 2000
      }
    });

    it('should reject outbound document (CFOP 5xxx)', () => {
      const moneyResult = Money.create(1000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(4),
        netAmount: moneyResult.value,
        cfop: '5102',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toBeInstanceOf(TaxCreditCalculationError);
        expect(result.error.message).toContain('não elegível');
      }
    });

    it('should reject outbound document (CFOP 6xxx)', () => {
      const moneyResult = Money.create(1000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(5),
        netAmount: moneyResult.value,
        cfop: '6102',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should reject document with empty CFOP', () => {
      const moneyResult = Money.create(1000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(6),
        netAmount: moneyResult.value,
        cfop: '',
        documentType: 'NFE',
      };

      const result = calculator.calculate(document);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('CFOP não informado');
      }
    });

    it('should use custom tax rate when provided', () => {
      const customRate = TaxRate.cumulative(); // PIS 0.65%, COFINS 3.0%
      const customCalculator = new TaxCreditCalculator(customRate);

      const moneyResult = Money.create(1000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const document: FiscalDocumentData = {
        id: BigInt(7),
        netAmount: moneyResult.value,
        cfop: '1102',
        documentType: 'NFE',
      };

      const result = customCalculator.calculate(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const credit = result.value;
        expect(credit.pisCredit.amount).toBeCloseTo(6.5); // 0.65% de 1000
        expect(credit.cofinsCredit.amount).toBeCloseTo(30); // 3.0% de 1000
        // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
        const totalCreditResult = credit.getTotalCredit();
        expect(Result.isOk(totalCreditResult)).toBe(true);
        expect(totalCreditResult.value.amount).toBeCloseTo(36.5); // 3.65% de 1000
      }
    });
  });

  describe('calculateDepreciationCredit', () => {
    it('should calculate monthly depreciation credit (48 months)', () => {
      const moneyResult = Money.create(10000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const result = calculator.calculateDepreciationCredit(moneyResult.value, 48);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const monthlyCredit = result.value;
        // Total credit = 10000 * 9.25% = 925
        // Monthly = 925 / 48 = 19.27
        expect(monthlyCredit.amount).toBeCloseTo(19.27, 2);
      }
    });

    it('should calculate monthly depreciation credit (60 months)', () => {
      const moneyResult = Money.create(12000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const result = calculator.calculateDepreciationCredit(moneyResult.value, 60);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const monthlyCredit = result.value;
        // Total credit = 12000 * 9.25% = 1110
        // Monthly = 1110 / 60 = 18.5
        expect(monthlyCredit.amount).toBeCloseTo(18.5, 2);
      }
    });

    it('should reject zero depreciation months', () => {
      const moneyResult = Money.create(10000, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const result = calculator.calculateDepreciationCredit(moneyResult.value, 0);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('maior que zero');
      }
    });

    it('should reject zero asset value', () => {
      const moneyResult = Money.create(0, 'BRL');
      if (Result.isFail(moneyResult)) throw new Error('Failed to create Money');
      
      const result = calculator.calculateDepreciationCredit(moneyResult.value, 48);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('maior que zero');
      }
    });
  });
});

