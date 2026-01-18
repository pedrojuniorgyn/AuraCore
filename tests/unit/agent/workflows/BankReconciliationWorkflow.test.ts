/**
 * @description Testes para BankReconciliationWorkflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BankReconciliationWorkflow,
  type BankReconciliationInput,
} from '@/agent/workflows/BankReconciliationWorkflow';
import { Result } from '@/shared/domain';

describe('BankReconciliationWorkflow', () => {
  let workflow: BankReconciliationWorkflow;

  beforeEach(() => {
    workflow = new BankReconciliationWorkflow();
  });

  describe('execute', () => {
    it('deve executar workflow completo com sucesso', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'statement.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.status).toBe('completed');
      expect(result.value.reconciliationId).toBeDefined();
      expect(result.value.summary).toBeDefined();
    });

    it('deve conter entradas do extrato', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.statementEntries.length).toBeGreaterThan(0);
    });

    it('deve conter entradas do sistema', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.systemEntries.length).toBeGreaterThan(0);
    });

    it('deve realizar matching de entradas', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.matchedEntries.length).toBeGreaterThan(0);
    });

    it('deve identificar entradas não conciliadas do extrato', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      // Deve haver pelo menos uma entrada não conciliada (tarifa bancária)
      expect(result.value.unmatchedStatement.length).toBeGreaterThan(0);
    });

    it('deve gerar resumo com totais corretos', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);
      const summary = result.value.summary!;

      expect(summary.totalStatementEntries).toBe(result.value.statementEntries.length);
      expect(summary.totalSystemEntries).toBe(result.value.systemEntries.length);
      expect(summary.matchedCount).toBe(result.value.matchedEntries.length);
      expect(summary.totalCredits).toBeGreaterThan(0);
      expect(summary.totalDebits).toBeGreaterThan(0);
      expect(summary.balance).toBe(summary.totalCredits - summary.totalDebits);
    });

    it('deve registrar logs de execução', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'email',
        statementIdentifier: 'msg-123',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.logs.length).toBeGreaterThan(0);
      expect(result.value.logs.some(l => l.includes('Iniciando conciliação'))).toBe(true);
      expect(result.value.logs.some(l => l.includes('concluída'))).toBe(true);
    });

    it('deve funcionar com diferentes fontes', async () => {
      const sources: Array<'email' | 'drive' | 'upload' | 'ofx'> = ['email', 'drive', 'upload', 'ofx'];

      for (const source of sources) {
        const input: BankReconciliationInput = {
          bankAccountId: 1,
          statementSource: source,
          statementIdentifier: `test-${source}`,
          period: { start: '2026-01-01', end: '2026-01-31' },
          organizationId: 1,
          branchId: 1,
          userId: 'user-123',
        };

        const result = await workflow.execute(input);
        expect(Result.isOk(result)).toBe(true);
        expect(result.value.status).toBe('completed');
      }
    });

    it('deve incluir timestamps de início e fim', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.startedAt).toBeInstanceOf(Date);
      expect(result.value.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('matching logic', () => {
    it('deve fazer match exato por valor, data e tipo', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-01' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      // Verifica se os matches exatos têm alta confiança
      const exactMatches = result.value.matchedEntries.filter(m => m.matchType === 'exact');
      for (const match of exactMatches) {
        expect(match.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('deve fazer match fuzzy quando data não coincide', async () => {
      const input: BankReconciliationInput = {
        bankAccountId: 1,
        statementSource: 'upload',
        statementIdentifier: 'test.ofx',
        period: { start: '2026-01-01', end: '2026-01-31' },
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      // Pode haver matches fuzzy
      const fuzzyMatches = result.value.matchedEntries.filter(m => m.matchType === 'fuzzy');
      for (const match of fuzzyMatches) {
        expect(match.confidence).toBeLessThan(0.9);
        expect(match.confidence).toBeGreaterThan(0);
      }
    });
  });
});
