/**
 * Integration Tests - Fiscal Value Objects
 * E7.27 - Testes de Integração
 *
 * Testa value objects e regras de negócio do módulo fiscal.
 *
 * @see Lei Complementar 87/96 (Lei Kandir) - ICMS
 * @see Leis 10.637/02 e 10.833/03 - PIS/COFINS
 */

import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';

describe('Fiscal Domain - Integration Tests', () => {
  // ==================== CFOP VALUE OBJECT TESTS ====================

  describe('CFOP Value Object', () => {
    it('should create valid CFOP for sale within state', () => {
      const cfopResult = CFOP.create('5102');

      expect(Result.isOk(cfopResult)).toBe(true);
      if (Result.isOk(cfopResult)) {
        expect(cfopResult.value.code).toBe('5102');
        expect(cfopResult.value.isIntrastate).toBe(true);
      }
    });

    it('should create valid CFOP for sale to another state', () => {
      const cfopResult = CFOP.create('6102');

      expect(Result.isOk(cfopResult)).toBe(true);
      if (Result.isOk(cfopResult)) {
        expect(cfopResult.value.code).toBe('6102');
        expect(cfopResult.value.isInterstate).toBe(true);
      }
    });

    it('should reject invalid CFOP format', () => {
      const cfopResult = CFOP.create('12345');

      expect(Result.isFail(cfopResult)).toBe(true);
    });
  });

  // ==================== FISCAL KEY TESTS ====================

  describe('Fiscal Key Generation', () => {
    it('should generate valid fiscal key for NFe (44 chars)', () => {
      const keyResult = FiscalKey.generate({
        ufCode: '35', // São Paulo
        yearMonth: '2601',
        cnpj: '12345678000190',
        model: '55', // NFe
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(keyResult)).toBe(true);
      if (Result.isOk(keyResult)) {
        expect(keyResult.value.value.length).toBe(44);
        expect(keyResult.value.ufCode).toBe('35');
        expect(keyResult.value.cnpj).toBe('12345678000190');
      }
    });

    it('should generate valid fiscal key for CTe', () => {
      const keyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2601',
        cnpj: '12345678000190',
        model: '57', // CTe
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(keyResult)).toBe(true);
      if (Result.isOk(keyResult)) {
        // Key starts with UF code
        expect(keyResult.value.value.startsWith('35')).toBe(true);
      }
    });

    it('should generate key with provided UF code', () => {
      const keyResult = FiscalKey.generate({
        ufCode: '31', // Minas Gerais
        yearMonth: '2601',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(keyResult)).toBe(true);
      if (Result.isOk(keyResult)) {
        expect(keyResult.value.ufCode).toBe('31');
      }
    });

    it('should extract UF code and CNPJ from fiscal key', () => {
      const keyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2601',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(keyResult)).toBe(true);
      if (Result.isOk(keyResult)) {
        const key = keyResult.value;
        expect(key.ufCode).toBe('35');
        expect(key.cnpj).toBe('12345678000190');
        // Key is 44 chars
        expect(key.value.length).toBe(44);
      }
    });
  });

  // ==================== MONEY VALUE OBJECT TESTS ====================

  describe('Money Operations for Fiscal Calculations', () => {
    it('should create Money with BRL currency', () => {
      const moneyResult = Money.create(1000, 'BRL');

      expect(Result.isOk(moneyResult)).toBe(true);
      if (Result.isOk(moneyResult)) {
        expect(moneyResult.value.amount).toBe(1000);
        expect(moneyResult.value.currency).toBe('BRL');
      }
    });

    it('should add two Money values', () => {
      const money1 = Money.create(500, 'BRL').value!;
      const money2 = Money.create(300, 'BRL').value!;

      const result = money1.add(money2);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(800);
      }
    });

    it('should subtract Money values', () => {
      const money1 = Money.create(1000, 'BRL').value!;
      const money2 = Money.create(250, 'BRL').value!;

      const result = money1.subtract(money2);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.amount).toBe(750);
      }
    });

    it('should reject operations with different currencies', () => {
      const brl = Money.create(1000, 'BRL').value!;
      const usd = Money.create(100, 'USD').value!;

      const result = brl.add(usd);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should calculate ICMS correctly (18%)', () => {
      const baseValue = Money.create(1000, 'BRL').value!;
      const icmsRate = 0.18;

      const icmsValue = Money.create(baseValue.amount * icmsRate, 'BRL').value!;

      expect(icmsValue.amount).toBe(180);
    });
  });
});
