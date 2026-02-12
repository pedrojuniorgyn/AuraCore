/**
 * Tests: CFOPDeterminationService
 * Domain Service para determinação de CFOP
 *
 * @module fiscal/domain/services
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { CFOPDeterminationService, type CFOPLookupInput } from '@/modules/fiscal/domain/services/CFOPDeterminationService';
import type { CFOPDetermination } from '@/modules/fiscal/domain/entities/CFOPDetermination';

// ============================================================================
// FIXTURES
// ============================================================================

function createRule(overrides: Partial<CFOPDetermination>): CFOPDetermination {
  return {
    id: 'rule-001',
    organizationId: 1,
    operationType: 'FREIGHT',
    direction: 'EXIT' as const,
    scope: 'INTRASTATE' as const,
    cfopCode: '5353',
    cfopDescription: 'Prestação de serviço de transporte',
    isDefault: true,
    priority: 10,
    status: 'ACTIVE',
    taxRegime: undefined,
    documentType: undefined,
    branchId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as CFOPDetermination;
}

// ============================================================================
// TESTS
// ============================================================================

describe('CFOPDeterminationService', () => {
  describe('determine()', () => {
    it('deve retornar CFOP correto para match exato', () => {
      const input: CFOPLookupInput = {
        operationType: 'FREIGHT',
        direction: 'EXIT',
        scope: 'INTRASTATE',
      };
      const rules = [createRule({ cfopCode: '5353' })];

      const result = CFOPDeterminationService.determine(input, rules);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.cfopCode).toBe('5353');
      }
    });

    it('deve retornar erro quando nenhuma regra faz match', () => {
      const input: CFOPLookupInput = {
        operationType: 'UNKNOWN_OP',
        direction: 'EXIT',
        scope: 'INTRASTATE',
      };

      const result = CFOPDeterminationService.determine(input, [createRule({})]);

      expect(Result.isFail(result)).toBe(true);
    });

    it('deve priorizar regra customizada sobre padrão', () => {
      const input: CFOPLookupInput = {
        operationType: 'FREIGHT',
        direction: 'EXIT',
        scope: 'INTRASTATE',
      };
      const rules = [
        createRule({ id: 'default', cfopCode: '5353', isDefault: true, priority: 10 }),
        createRule({ id: 'custom', cfopCode: '5932', isDefault: false, priority: 10 }),
      ];

      const result = CFOPDeterminationService.determine(input, rules);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.cfopCode).toBe('5932');
        expect(result.value.isDefault).toBe(false);
      }
    });

    it('deve priorizar menor priority entre regras do mesmo tipo', () => {
      const input: CFOPLookupInput = {
        operationType: 'FREIGHT',
        direction: 'EXIT',
        scope: 'INTERSTATE',
      };
      const rules = [
        createRule({ id: 'low-prio', cfopCode: '6353', scope: 'INTERSTATE', priority: 20 }),
        createRule({ id: 'high-prio', cfopCode: '6932', scope: 'INTERSTATE', priority: 5 }),
      ];

      const result = CFOPDeterminationService.determine(input, rules);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.cfopCode).toBe('6932');
      }
    });

    it('deve filtrar por taxRegime quando especificado', () => {
      const input: CFOPLookupInput = {
        operationType: 'FREIGHT',
        direction: 'EXIT',
        scope: 'INTRASTATE',
        taxRegime: 'SIMPLES',
      };
      const rules = [
        createRule({ id: 'r1', cfopCode: '5353', taxRegime: 'LUCRO_REAL' }),
        createRule({ id: 'r2', cfopCode: '5932', taxRegime: 'SIMPLES' }),
      ];

      const result = CFOPDeterminationService.determine(input, rules);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.cfopCode).toBe('5932');
      }
    });
  });

  describe('inferScope()', () => {
    it('deve retornar INTRASTATE para mesma UF', () => {
      expect(CFOPDeterminationService.inferScope('SP', 'SP')).toBe('INTRASTATE');
    });

    it('deve retornar INTERSTATE para UFs diferentes', () => {
      expect(CFOPDeterminationService.inferScope('SP', 'RJ')).toBe('INTERSTATE');
    });

    it('deve retornar FOREIGN quando UF é EX', () => {
      expect(CFOPDeterminationService.inferScope('SP', 'EX')).toBe('FOREIGN');
      expect(CFOPDeterminationService.inferScope('EX', 'SP')).toBe('FOREIGN');
    });

    it('deve ser case-insensitive', () => {
      expect(CFOPDeterminationService.inferScope('sp', 'SP')).toBe('INTRASTATE');
    });

    it('deve retornar INTRASTATE quando UF vazia', () => {
      expect(CFOPDeterminationService.inferScope('', '')).toBe('INTRASTATE');
    });
  });

  describe('inferDirection()', () => {
    it('deve retornar ENTRY para COMPRA', () => {
      expect(CFOPDeterminationService.inferDirection('COMPRA')).toBe('ENTRY');
    });

    it('deve retornar ENTRY para PURCHASE', () => {
      expect(CFOPDeterminationService.inferDirection('PURCHASE')).toBe('ENTRY');
    });

    it('deve retornar ENTRY para DEVOLUCAO_VENDA', () => {
      expect(CFOPDeterminationService.inferDirection('DEVOLUCAO_VENDA')).toBe('ENTRY');
    });

    it('deve retornar EXIT para FREIGHT (padrão)', () => {
      expect(CFOPDeterminationService.inferDirection('FREIGHT')).toBe('EXIT');
    });

    it('deve retornar EXIT para operações desconhecidas', () => {
      expect(CFOPDeterminationService.inferDirection('UNKNOWN')).toBe('EXIT');
    });
  });

  describe('convertDirection()', () => {
    it('deve converter saída estadual para entrada: 5353 -> 1353', () => {
      expect(CFOPDeterminationService.convertDirection('5353', 'ENTRY')).toBe('1353');
    });

    it('deve converter saída interestadual para entrada: 6102 -> 2102', () => {
      expect(CFOPDeterminationService.convertDirection('6102', 'ENTRY')).toBe('2102');
    });

    it('deve converter saída exterior para entrada: 7102 -> 3102', () => {
      expect(CFOPDeterminationService.convertDirection('7102', 'ENTRY')).toBe('3102');
    });

    it('deve converter entrada para saída: 1353 -> 5353', () => {
      expect(CFOPDeterminationService.convertDirection('1353', 'EXIT')).toBe('5353');
    });

    it('deve converter entrada interestadual para saída: 2102 -> 6102', () => {
      expect(CFOPDeterminationService.convertDirection('2102', 'EXIT')).toBe('6102');
    });

    it('deve manter entrada quando já é entrada', () => {
      expect(CFOPDeterminationService.convertDirection('1353', 'ENTRY')).toBe('1353');
    });
  });
});
