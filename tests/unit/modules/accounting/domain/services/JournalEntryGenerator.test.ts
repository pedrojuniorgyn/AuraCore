/**
 * Journal Entry Generator Tests
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { JournalEntryGenerator } from '@/modules/accounting/domain/services/JournalEntryGenerator';
import type { GenerateJournalLinesInput } from '@/modules/accounting/domain/services/JournalEntryGenerator';
import type { FiscalDocumentItem, ChartAccount } from '@/modules/accounting/domain/ports';

describe('JournalEntryGenerator', () => {
  const generator = new JournalEntryGenerator();

  describe('generateJournalLines', () => {
    it('should generate balanced journal lines for purchase document', async () => {
      // Arrange
      const items: FiscalDocumentItem[] = [
        {
          id: 1n,
          chartAccountId: 100n,
          chartAccountCode: '4.1.01.001',
          chartAccountName: 'Custo da Mercadoria',
          netAmount: 1000.00,
        },
      ];

      const counterpartAccount: ChartAccount = {
        id: 200n,
        code: '2.1.01.001',
        name: 'Fornecedores a Pagar',
        isAnalytical: true,
      };

      const input: GenerateJournalLinesInput = {
        items,
        counterpartAccount,
        totalAmount: 1000.00,
        validateAccount: async (accountId) => {
          return Result.ok({
            id: accountId,
            code: '4.1.01.001',
            name: 'Custo da Mercadoria',
            isAnalytical: true,
          });
        },
        getAnalyticalAccounts: async () => Result.ok([]),
      };

      // Act
      const result = await generator.generateJournalLines(input);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.lines.length).toBe(2); // 1 DEBIT + 1 CREDIT
        expect(result.value.totalDebit).toBe(1000.00);
        expect(result.value.totalCredit).toBe(1000.00);

        // Validate DEBIT line
        const debitLine = result.value.lines[0];
        expect(debitLine.type).toBe('DEBIT');
        expect(debitLine.accountCode).toBe('4.1.01.001');
        expect(debitLine.amount.amount).toBe(1000.00);

        // Validate CREDIT line
        const creditLine = result.value.lines[1];
        expect(creditLine.type).toBe('CREDIT');
        expect(creditLine.accountCode).toBe('2.1.01.001');
        expect(creditLine.amount.amount).toBe(1000.00);
      }
    });

    it('should reject synthetic account and suggest analytical accounts', async () => {
      // Arrange
      const items: FiscalDocumentItem[] = [
        {
          id: 1n,
          chartAccountId: 100n,
          chartAccountCode: '4.1.01',
          chartAccountName: 'Custos (Sintética)',
          netAmount: 1000.00,
        },
      ];

      const counterpartAccount: ChartAccount = {
        id: 200n,
        code: '2.1.01.001',
        name: 'Fornecedores a Pagar',
        isAnalytical: true,
      };

      const input: GenerateJournalLinesInput = {
        items,
        counterpartAccount,
        totalAmount: 1000.00,
        validateAccount: async () => {
          return Result.ok({
            id: 100n,
            code: '4.1.01',
            name: 'Custos (Sintética)',
            isAnalytical: false, // SINTÉTICA!
          });
        },
        getAnalyticalAccounts: async () => {
          return Result.ok([
            { id: 101n, code: '4.1.01.001', name: 'Custo da Mercadoria', isAnalytical: true },
            { id: 102n, code: '4.1.01.002', name: 'Custo de Frete', isAnalytical: true },
          ]);
        },
      };

      // Act
      const result = await generator.generateJournalLines(input);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('SINTÉTICA');
        expect(result.error.message).toContain('4.1.01.001');
        expect(result.error.message).toContain('4.1.01.002');
      }
    });

    it('should handle multiple items with different accounts', async () => {
      // Arrange
      const items: FiscalDocumentItem[] = [
        {
          id: 1n,
          chartAccountId: 100n,
          chartAccountCode: '4.1.01.001',
          chartAccountName: 'Custo da Mercadoria',
          netAmount: 800.00,
        },
        {
          id: 2n,
          chartAccountId: 101n,
          chartAccountCode: '4.1.02.001',
          chartAccountName: 'Custo de Frete',
          netAmount: 200.00,
        },
      ];

      const counterpartAccount: ChartAccount = {
        id: 200n,
        code: '2.1.01.001',
        name: 'Fornecedores a Pagar',
        isAnalytical: true,
      };

      const input: GenerateJournalLinesInput = {
        items,
        counterpartAccount,
        totalAmount: 1000.00,
        validateAccount: async (accountId) => {
          const accounts: Record<string, ChartAccount> = {
            '100': { id: 100n, code: '4.1.01.001', name: 'Custo da Mercadoria', isAnalytical: true },
            '101': { id: 101n, code: '4.1.02.001', name: 'Custo de Frete', isAnalytical: true },
          };
          return Result.ok(accounts[accountId.toString()]);
        },
        getAnalyticalAccounts: async () => Result.ok([]),
      };

      // Act
      const result = await generator.generateJournalLines(input);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.lines.length).toBe(3); // 2 DEBITS + 1 CREDIT
        expect(result.value.totalDebit).toBe(1000.00);
        expect(result.value.totalCredit).toBe(1000.00);

        // Validate line numbers
        expect(result.value.lines[0].lineNumber).toBe(1);
        expect(result.value.lines[1].lineNumber).toBe(2);
        expect(result.value.lines[2].lineNumber).toBe(3);
      }
    });

    it('should reject unbalanced entry', async () => {
      // Arrange
      const items: FiscalDocumentItem[] = [
        {
          id: 1n,
          chartAccountId: 100n,
          chartAccountCode: '4.1.01.001',
          chartAccountName: 'Custo da Mercadoria',
          netAmount: 800.00, // Débito: 800
        },
      ];

      const counterpartAccount: ChartAccount = {
        id: 200n,
        code: '2.1.01.001',
        name: 'Fornecedores a Pagar',
        isAnalytical: true,
      };

      const input: GenerateJournalLinesInput = {
        items,
        counterpartAccount,
        totalAmount: 1000.00, // Crédito: 1000 (DESBALANCEADO!)
        validateAccount: async () => {
          return Result.ok({
            id: 100n,
            code: '4.1.01.001',
            name: 'Custo da Mercadoria',
            isAnalytical: true,
          });
        },
        getAnalyticalAccounts: async () => Result.ok([]),
      };

      // Act
      const result = await generator.generateJournalLines(input);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('desbalanceado');
        expect(result.error.message).toContain('800');
        expect(result.error.message).toContain('1000');
      }
    });

    it('should skip items without chart account', async () => {
      // Arrange
      const items: FiscalDocumentItem[] = [
        {
          id: 1n,
          chartAccountId: null, // SEM CONTA!
          chartAccountCode: null,
          chartAccountName: null,
          netAmount: 500.00,
        },
        {
          id: 2n,
          chartAccountId: 100n,
          chartAccountCode: '4.1.01.001',
          chartAccountName: 'Custo da Mercadoria',
          netAmount: 1000.00,
        },
      ];

      const counterpartAccount: ChartAccount = {
        id: 200n,
        code: '2.1.01.001',
        name: 'Fornecedores a Pagar',
        isAnalytical: true,
      };

      const input: GenerateJournalLinesInput = {
        items,
        counterpartAccount,
        totalAmount: 1000.00,
        validateAccount: async () => {
          return Result.ok({
            id: 100n,
            code: '4.1.01.001',
            name: 'Custo da Mercadoria',
            isAnalytical: true,
          });
        },
        getAnalyticalAccounts: async () => Result.ok([]),
      };

      // Act
      const result = await generator.generateJournalLines(input);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Apenas 1 DEBIT (item com conta) + 1 CREDIT
        expect(result.value.lines.length).toBe(2);
        expect(result.value.lines[0].accountCode).toBe('4.1.01.001');
      }
    });
  });

  describe('canReverse', () => {
    it('should allow reversing POSTED entry', () => {
      const result = generator.canReverse('POSTED');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject reversing already REVERSED entry', () => {
      const result = generator.canReverse('REVERSED');
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('já foi revertido');
      }
    });

    it('should reject reversing CANCELLED entry', () => {
      const result = generator.canReverse('CANCELLED');
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.message).toContain('cancelado');
      }
    });
  });
});

