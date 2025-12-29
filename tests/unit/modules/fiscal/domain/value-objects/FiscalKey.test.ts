import { describe, it, expect } from 'vitest';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';
import { Result } from '@/shared/domain';

describe('FiscalKey', () => {
  // Chave válida de exemplo (com DV correto)
  const validKey = '35210612345678901234550010000000011234567890';

  describe('create', () => {
    it('should create valid fiscal key', () => {
      // Usar gerador para obter chave válida
      const generateResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2106',
        cnpj: '12345678901234',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '23456789',
      });

      expect(Result.isOk(generateResult)).toBe(true);
      if (Result.isOk(generateResult)) {
        expect(generateResult.value.value).toHaveLength(44);
      }
    });

    it('should fail with wrong length', () => {
      const result = FiscalKey.create('123456');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should extract parts correctly', () => {
      const generateResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2106',
        cnpj: '12345678901234',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '23456789',
      });

      expect(Result.isOk(generateResult)).toBe(true);
      if (Result.isOk(generateResult)) {
        const parts = generateResult.value.parts;
        expect(parts.uf).toBe('35');
        expect(parts.cnpj).toBe('12345678901234');
        expect(parts.model).toBe('55');
        expect(parts.series).toBe('001');
      }
    });
  });

  describe('generate', () => {
    it('should generate valid key with correct check digit', () => {
      const result = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000199',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Criar novamente com a mesma chave deve validar o DV
        const validateResult = FiscalKey.create(result.value.value);
        expect(Result.isOk(validateResult)).toBe(true);
      }
    });
  });

  describe('formatted', () => {
    it('should format key in groups of 4', () => {
      const generateResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000199',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });

      expect(Result.isOk(generateResult)).toBe(true);
      if (Result.isOk(generateResult)) {
        const formatted = generateResult.value.formatted;
        expect(formatted).toContain(' ');
        // Remove espaços e verifica tamanho
        expect(formatted.replace(/\s/g, '')).toHaveLength(44);
      }
    });
  });
});

