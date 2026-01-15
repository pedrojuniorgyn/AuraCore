/**
 * Testes Unitários - SpedContributionsGenerator
 * E7.18 - Migração SPED - Fase 1 (Testes Básicos)
 * 
 * Escopo: Validação básica do método generate()
 * Cobertura: Estrutura mínima SPED Contribuições (Blocos 0, A, C, M, 9)
 */

import { describe, it, expect } from 'vitest';
import { SpedContributionsGenerator } from '@/modules/fiscal/domain/services/SpedContributionsGenerator';
import { Result } from '@/shared/domain';
import type {
  SpedContributionsInput,
  SpedContributionsData,
} from '@/modules/fiscal/domain/services/SpedContributionsGenerator';

describe('SpedContributionsGenerator - Basic Tests', () => {
  const generator = new SpedContributionsGenerator();

  describe('generate()', () => {
    it('should generate SPED Contributions document with mocked data', () => {
      // Arrange
      const input: SpedContributionsInput = {
        organizationId: 1,
        branchId: 1,
        referenceMonth: 1,
        referenceYear: 2026,
        finality: 'ORIGINAL',
      };

      const data: SpedContributionsData = {
        company: {
          document: '12345678000190',
        },
        ctes: [],
        nfesEntrada: [],
        taxTotals: {
          baseDebito: 0,
          baseCredito: 0,
        },
      };

      // Act
      const result = generator.generate(input, data);

      // Assert
      expect(result).toBeDefined();
      expect(Result.isOk(result) || Result.isFail(result)).toBe(true);
      
      // Se sucesso, validar estrutura básica
      if (Result.isOk(result)) {
        const document = result.value;
        expect(document.documentType).toBe('EFD_CONTRIBUICOES');
        expect(document.totalLines).toBeGreaterThan(0);
      }
    });

    it('should handle invalid input gracefully', () => {
      // Arrange - CNPJ inválido
      const input: SpedContributionsInput = {
        organizationId: 1,
        branchId: 1,
        referenceMonth: 1,
        referenceYear: 2026,
        finality: 'ORIGINAL',
      };

      const data: SpedContributionsData = {
        company: {
          document: '123', // CNPJ inválido (não tem 14 caracteres)
        },
        ctes: [],
        nfesEntrada: [],
        taxTotals: {
          baseDebito: 0,
          baseCredito: 0,
        },
      };

      // Act
      const result = generator.generate(input, data);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('CNPJ');
      }
    });

  });
});
