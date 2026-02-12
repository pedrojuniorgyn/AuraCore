/**
 * Tests: AutoReconciliationService
 * Domain Service para conciliação bancária automática
 *
 * @module financial/domain/services
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import {
  AutoReconciliationService,
  DEFAULT_RECONCILIATION_CONFIG,
  type BankTransactionForReconciliation,
  type FinancialTitleForReconciliation,
  type ReconciliationConfig,
} from '@/modules/financial/domain/services/AutoReconciliationService';

// ============================================================================
// FIXTURES
// ============================================================================

function createTransaction(overrides: Partial<BankTransactionForReconciliation> = {}): BankTransactionForReconciliation {
  return {
    id: 'tx-001',
    fitId: 'FIT-001',
    transactionDate: new Date('2026-01-15'),
    amount: -1500.00,
    description: 'PAG FORNECEDOR ABC LTDA',
    direction: 'DEBIT',
    reconciled: 'N',
    ...overrides,
  };
}

function createTitle(overrides: Partial<FinancialTitleForReconciliation> = {}): FinancialTitleForReconciliation {
  return {
    id: 'title-001',
    type: 'PAYABLE',
    description: 'Frete SP-RJ',
    partnerName: 'ABC Ltda',
    amount: 1500.00,
    dueDate: new Date('2026-01-15'),
    status: 'OPEN',
    documentNumber: 'NF-12345',
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('AutoReconciliationService', () => {
  describe('reconcile()', () => {
    it('deve retornar resultado vazio quando não há transações', () => {
      const result = AutoReconciliationService.reconcile([], [createTitle()]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(0);
        expect(result.value.totalTransactions).toBe(0);
      }
    });

    it('deve retornar resultado vazio quando todas transações já estão reconciliadas', () => {
      const tx = createTransaction({ reconciled: 'S' });
      const result = AutoReconciliationService.reconcile([tx], [createTitle()]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(0);
      }
    });

    it('deve fazer match exato (valor + data + descrição)', () => {
      const tx = createTransaction({
        amount: -1500.00,
        transactionDate: new Date('2026-01-15'),
        description: 'PAG FORNECEDOR ABC LTDA',
        direction: 'DEBIT',
      });
      const title = createTitle({
        amount: 1500.00,
        dueDate: new Date('2026-01-15'),
        partnerName: 'ABC Ltda',
        type: 'PAYABLE',
      });

      const result = AutoReconciliationService.reconcile([tx], [title]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1);
        expect(result.value.matches[0].confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.value.matches[0].titleId).toBe('title-001');
        expect(result.value.matches[0].transactionId).toBe('tx-001');
      }
    });

    it('deve fazer match CREDIT -> RECEIVABLE', () => {
      const tx = createTransaction({
        id: 'tx-credit',
        amount: 2500.00,
        direction: 'CREDIT',
        description: 'RECEBIMENTO CLIENTE XYZ',
        transactionDate: new Date('2026-01-20'),
      });
      const title = createTitle({
        id: 'title-recv',
        type: 'RECEIVABLE',
        amount: 2500.00,
        dueDate: new Date('2026-01-20'),
        partnerName: 'XYZ',
        status: 'OPEN',
      });

      const result = AutoReconciliationService.reconcile([tx], [title]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1);
        expect(result.value.matches[0].titleType).toBe('RECEIVABLE');
      }
    });

    it('deve rejeitar match quando valor difere mais que R$ 1,00', () => {
      const tx = createTransaction({ amount: -1500.00 });
      const title = createTitle({ amount: 1600.00 }); // R$ 100 de diferença

      const result = AutoReconciliationService.reconcile([tx], [title]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(0);
        expect(result.value.unmatchedTransactions).toHaveLength(1);
      }
    });

    it('deve fazer fuzzy match quando valor exato mas data difere 2 dias', () => {
      const tx = createTransaction({
        amount: -3000.00,
        transactionDate: new Date('2026-01-17'),
        description: 'PAGAMENTO EMPRESA XYZ',
      });
      const title = createTitle({
        amount: 3000.00,
        dueDate: new Date('2026-01-15'),
        partnerName: 'Empresa XYZ',
      });

      // Use lower confidence threshold to accept fuzzy matches
      const config = {
        ...DEFAULT_RECONCILIATION_CONFIG,
        minAutoMatchConfidence: 0.50,
      };

      const result = AutoReconciliationService.reconcile([tx], [title], config);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1);
        expect(result.value.matches[0].confidence).toBeGreaterThan(0.5);
      }
    });

    it('deve priorizar match com maior confiança quando múltiplos títulos', () => {
      const tx = createTransaction({
        amount: -1000.00,
        transactionDate: new Date('2026-01-15'),
        description: 'PAG FRETE NORTE',
      });
      const title1 = createTitle({
        id: 'title-close-date',
        amount: 1000.00,
        dueDate: new Date('2026-01-15'),
        partnerName: 'Norte Transportes',
      });
      const title2 = createTitle({
        id: 'title-far-date',
        amount: 1000.00,
        dueDate: new Date('2026-01-25'), // 10 dias de diferença
        partnerName: 'Outro Fornecedor',
      });

      const result = AutoReconciliationService.reconcile([tx], [title1, title2]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1);
        expect(result.value.matches[0].titleId).toBe('title-close-date');
      }
    });

    it('deve ignorar títulos que não estão OPEN', () => {
      const tx = createTransaction({ amount: -500.00 });
      const title = createTitle({ amount: 500.00, status: 'PAID' });

      const result = AutoReconciliationService.reconcile([tx], [title]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(0);
      }
    });

    it('deve não reutilizar título já matched', () => {
      const tx1 = createTransaction({ id: 'tx-1', amount: -1000.00 });
      const tx2 = createTransaction({ id: 'tx-2', amount: -1000.00 });
      const title = createTitle({ amount: 1000.00 }); // Apenas 1 título

      const result = AutoReconciliationService.reconcile([tx1, tx2], [title]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1); // Só 1 match
        expect(result.value.unmatchedTransactions).toHaveLength(1);
      }
    });

    it('deve incluir número do documento nos matchReasons quando encontrado na descrição', () => {
      const tx = createTransaction({
        amount: -2000.00,
        description: 'PAG NF-12345 ABC LTDA',
        transactionDate: new Date('2026-01-15'),
      });
      const title = createTitle({
        amount: 2000.00,
        dueDate: new Date('2026-01-15'),
        documentNumber: 'NF-12345',
        partnerName: 'ABC Ltda',
      });

      // Use lower threshold to ensure document number match is included
      const config = {
        ...DEFAULT_RECONCILIATION_CONFIG,
        minAutoMatchConfidence: 0.50,
      };

      const result = AutoReconciliationService.reconcile([tx], [title], config);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(1);
        const reasons = result.value.matches[0].matchReasons;
        expect(reasons.some(r => r.includes('NF-12345'))).toBe(true);
      }
    });

    it('deve respeitar minAutoMatchConfidence do config', () => {
      const tx = createTransaction({
        amount: -500.00,
        transactionDate: new Date('2026-02-01'), // Data muito diferente
        description: 'TRANSFERENCIA',
      });
      const title = createTitle({
        amount: 500.00,
        dueDate: new Date('2026-01-15'), // 17 dias de diferença
        partnerName: 'Outro Nome',
      });

      const strictConfig: ReconciliationConfig = {
        ...DEFAULT_RECONCILIATION_CONFIG,
        minAutoMatchConfidence: 0.95, // Muito alta
      };

      const result = AutoReconciliationService.reconcile([tx], [title], strictConfig);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(0); // Confiança insuficiente
      }
    });

    it('deve reconciliar múltiplas transações corretamente', () => {
      const txs: BankTransactionForReconciliation[] = [
        createTransaction({ id: 'tx-a', amount: -1000.00, transactionDate: new Date('2026-01-10'), direction: 'DEBIT', description: 'PAG FORN A' }),
        createTransaction({ id: 'tx-b', amount: 2000.00, transactionDate: new Date('2026-01-12'), direction: 'CREDIT', description: 'REC CLIENTE B' }),
        createTransaction({ id: 'tx-c', amount: -500.00, transactionDate: new Date('2026-01-15'), direction: 'DEBIT', description: 'PAG FORN C' }),
      ];
      const titles: FinancialTitleForReconciliation[] = [
        createTitle({ id: 'pay-a', type: 'PAYABLE', amount: 1000.00, dueDate: new Date('2026-01-10'), partnerName: 'Forn A' }),
        createTitle({ id: 'recv-b', type: 'RECEIVABLE', amount: 2000.00, dueDate: new Date('2026-01-12'), partnerName: 'Cliente B' }),
        createTitle({ id: 'pay-c', type: 'PAYABLE', amount: 500.00, dueDate: new Date('2026-01-15'), partnerName: 'Forn C' }),
      ];

      const result = AutoReconciliationService.reconcile(txs, titles);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.matchesFound).toBe(3);
        expect(result.value.unmatchedTransactions).toHaveLength(0);
        expect(result.value.unmatchedTitles).toHaveLength(0);
      }
    });
  });
});
