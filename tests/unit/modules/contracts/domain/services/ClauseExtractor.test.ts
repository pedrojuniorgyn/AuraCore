/**
 * Testes Unitários - ClauseExtractor
 *
 * @module tests/unit/modules/contracts/domain/services
 * @see E-Agent-Fase-D5
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { ClauseExtractor } from '@/modules/contracts/domain/services/ClauseExtractor';

describe('ClauseExtractor', () => {
  // ==========================================================================
  // CNPJ EXTRACTION
  // ==========================================================================

  describe('extractCNPJs', () => {
    it('should extract formatted CNPJ', () => {
      const text = 'CNPJ: 12.345.678/0001-95';
      const result = ClauseExtractor.extractCNPJs(text);
      expect(result).toContain('12345678000195');
    });

    it('should extract unformatted CNPJ', () => {
      const text = 'CNPJ: 12345678000195';
      const result = ClauseExtractor.extractCNPJs(text);
      expect(result).toContain('12345678000195');
    });

    it('should extract multiple CNPJs', () => {
      const text = 'CNPJ: 12.345.678/0001-95 e CNPJ: 98.765.432/0001-10';
      const result = ClauseExtractor.extractCNPJs(text);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no CNPJ found', () => {
      const text = 'Texto sem CNPJ';
      const result = ClauseExtractor.extractCNPJs(text);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // CPF EXTRACTION
  // ==========================================================================

  describe('extractCPFs', () => {
    it('should extract formatted CPF', () => {
      const text = 'CPF: 123.456.789-00';
      const result = ClauseExtractor.extractCPFs(text);
      expect(result).toContain('12345678900');
    });

    it('should extract unformatted CPF', () => {
      const text = 'CPF: 12345678900';
      const result = ClauseExtractor.extractCPFs(text);
      expect(result).toContain('12345678900');
    });

    it('should extract multiple CPFs', () => {
      const text = 'CPF: 123.456.789-00 e CPF: 987.654.321-00';
      const result = ClauseExtractor.extractCPFs(text);
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // CURRENCY EXTRACTION
  // ==========================================================================

  describe('extractCurrencyValues', () => {
    it('should extract R$ formatted value', () => {
      const text = 'Valor: R$ 1.500,00';
      const result = ClauseExtractor.extractCurrencyValues(text);
      expect(result).toContain(1500);
    });

    it('should extract simple number value', () => {
      const text = 'Valor: R$ 1.500,00 reais';
      const result = ClauseExtractor.extractCurrencyValues(text);
      expect(result).toContain(1500);
    });

    it('should extract multiple currency values', () => {
      const text = 'Mínimo R$ 100,00 e máximo R$ 500,00';
      const result = ClauseExtractor.extractCurrencyValues(text);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // DATE EXTRACTION
  // ==========================================================================

  describe('extractDates', () => {
    it('should extract DD/MM/YYYY format', () => {
      const text = 'Data: 15/03/2024';
      const result = ClauseExtractor.extractDates(text);
      expect(result).toHaveLength(1);
      expect(result[0].getFullYear()).toBe(2024);
    });

    it('should extract DD-MM-YYYY format', () => {
      const text = 'Data: 15-03-2024';
      const result = ClauseExtractor.extractDates(text);
      expect(result).toHaveLength(1);
    });

    it('should extract written date format', () => {
      const text = '1º de janeiro de 2024';
      const result = ClauseExtractor.extractDates(text);
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // PERCENTAGE EXTRACTION
  // ==========================================================================

  describe('extractPercentages', () => {
    it('should extract integer percentage', () => {
      const text = 'Multa de 10%';
      const result = ClauseExtractor.extractPercentages(text);
      expect(result).toContain(10);
    });

    it('should extract decimal percentage', () => {
      const text = 'Taxa de 0,5%';
      const result = ClauseExtractor.extractPercentages(text);
      expect(result).toContain(0.5);
    });
  });

  // ==========================================================================
  // DAYS EXTRACTION
  // ==========================================================================

  describe('extractDaysPeriods', () => {
    it('should extract simple days', () => {
      const text = 'Prazo de 30 dias';
      const result = ClauseExtractor.extractDaysPeriods(text);
      expect(result).toContain(30);
    });

    it('should extract days with text in parentheses', () => {
      const text = '30 (trinta) dias';
      const result = ClauseExtractor.extractDaysPeriods(text);
      expect(result).toContain(30);
    });
  });

  // ==========================================================================
  // EMAILS & PHONES
  // ==========================================================================

  describe('extractEmails', () => {
    it('should extract email', () => {
      const text = 'Contato: contato@empresa.com.br';
      const result = ClauseExtractor.extractEmails(text);
      expect(result).toContain('contato@empresa.com.br');
    });
  });

  describe('extractPhones', () => {
    it('should extract phone with DDD', () => {
      const text = 'Tel: (11) 99999-8888';
      const result = ClauseExtractor.extractPhones(text);
      expect(result).toContain('11999998888');
    });
  });

  // ==========================================================================
  // REAJUSTMENT INDEXES
  // ==========================================================================

  describe('extractReajustmentIndexes', () => {
    it('should extract IPCA', () => {
      const text = 'Reajuste pelo IPCA';
      const result = ClauseExtractor.extractReajustmentIndexes(text);
      expect(result).toContain('IPCA');
    });

    it('should extract IGP-M', () => {
      const text = 'Reajuste pelo IGP-M';
      const result = ClauseExtractor.extractReajustmentIndexes(text);
      expect(result).toContain('IGPM');
    });
  });

  // ==========================================================================
  // CLAUSE COUNTING
  // ==========================================================================

  describe('countClauses', () => {
    it('should count clauses', () => {
      const text = 'CLÁUSULA PRIMEIRA... CLÁUSULA SEGUNDA... CLÁUSULA TERCEIRA...';
      const result = ClauseExtractor.countClauses(text);
      expect(result).toBe(3);
    });
  });

  // ==========================================================================
  // SECTION EXTRACTION
  // ==========================================================================

  describe('extractSection', () => {
    it('should extract section by title', () => {
      const text = 'CLÁUSULA: OBJETO\nDescrição do objeto do contrato';
      const result = ClauseExtractor.extractSection(text, 'OBJETO');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail if section not found', () => {
      const text = 'Texto sem a seção desejada';
      const result = ClauseExtractor.extractSection(text, 'INEXISTENTE');
      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe('isValidCNPJ', () => {
    it('should validate correct CNPJ', () => {
      // CNPJ válido de teste
      expect(ClauseExtractor.isValidCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('should reject invalid CNPJ', () => {
      expect(ClauseExtractor.isValidCNPJ('11.111.111/1111-11')).toBe(false);
    });

    it('should reject CNPJ with wrong length', () => {
      expect(ClauseExtractor.isValidCNPJ('123')).toBe(false);
    });
  });

  describe('isValidCPF', () => {
    it('should validate correct CPF', () => {
      // CPF válido de teste
      expect(ClauseExtractor.isValidCPF('529.982.247-25')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(ClauseExtractor.isValidCPF('111.111.111-11')).toBe(false);
    });

    it('should reject CPF with wrong length', () => {
      expect(ClauseExtractor.isValidCPF('123')).toBe(false);
    });
  });
});
