import { describe, it, expect } from 'vitest';
import { TransactionCategorizer } from '@/modules/financial/domain/services/bank-statement/TransactionCategorizer';
import { Result } from '@/shared/domain';
import { createMockTransaction } from '../../../../../../fixtures/financial/bank-statement-fixtures';
import type { TransactionCategory } from '@/modules/financial/domain/types';

describe('TransactionCategorizer', () => {
  describe('categorize', () => {
    it('deve categorizar transação de combustível', () => {
      const transaction = createMockTransaction({
        description: 'COMPRA CARTAO - POSTO SHELL',
        amount: -100,
        direction: 'DEBIT',
      });
      
      const result = TransactionCategorizer.categorize(transaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.category).toBe('FUEL');
        expect(result.value.confidence).toBeGreaterThan(0);
      }
    });

    it('deve categorizar transação baseado em patterns de descrição e direção', () => {
      // Combustível - tem POSTO na descrição + direção DEBIT
      const fuelTransaction = createMockTransaction({
        description: 'COMPRA CARTAO POSTO IPIRANGA',
        normalizedDescription: 'compra cartao posto ipiranga',
        amount: -100,
        direction: 'DEBIT',
        type: 'POS',
      });
      
      const result = TransactionCategorizer.categorize(fuelTransaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.category).toBe('FUEL');
        expect(result.value.confidence).toBeGreaterThan(0.5);
      }
    });

    it('deve categorizar juros recebidos baseado em transactionType INT + direção CREDIT', () => {
      const interestTransaction = createMockTransaction({
        description: 'RENDIMENTO POUPANCA',
        normalizedDescription: 'rendimento poupanca',
        amount: 50,
        direction: 'CREDIT',
        type: 'INT', // Interest = INTEREST category
      });
      
      const result = TransactionCategorizer.categorize(interestTransaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.category).toBe('INTEREST');
      }
    });

    it('deve retornar categoria quando há match de pattern', () => {
      // Usando regra TRANSFER que tem transactionType XFER
      const transferTransaction = createMockTransaction({
        description: 'TRANSF PARA CONTA',
        normalizedDescription: 'transf para conta',
        amount: -1000,
        direction: 'DEBIT',
        type: 'XFER', // Type XFER = TRANSFER category
      });
      
      const result = TransactionCategorizer.categorize(transferTransaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // A categorização deve retornar uma categoria e confidence
        expect(result.value.category).toBeDefined();
        expect(result.value.confidence).toBeGreaterThan(0);
      }
    });

    it('deve retornar resultado com confidence score', () => {
      const transaction = createMockTransaction({
        description: 'QUALQUER TRANSACAO',
        direction: 'CREDIT',
        type: 'OTHER',
      });
      
      const result = TransactionCategorizer.categorize(transaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(typeof result.value.confidence).toBe('number');
        expect(result.value.confidence).toBeGreaterThanOrEqual(0);
        expect(result.value.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('deve retornar categoria com baixa confiança para descrições não reconhecidas', () => {
      const transaction = createMockTransaction({
        description: 'QWERT12345 ABC',
        normalizedDescription: 'qwert12345 abc',
        amount: -100,
        direction: 'CREDIT', // Credit direction to avoid FUEL match
        type: 'OTHER',
      });
      
      const result = TransactionCategorizer.categorize(transaction);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // For unrecognized descriptions, confidence should be low
        expect(result.value.confidence).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('categorizeBatch', () => {
    it('deve categorizar múltiplas transações', () => {
      const transactions = [
        createMockTransaction({ description: 'POSTO IPIRANGA', amount: -100, direction: 'DEBIT' }),
        createMockTransaction({ description: 'TARIFA BANCARIA', amount: -25, direction: 'DEBIT', type: 'FEE' }),
        createMockTransaction({ description: 'PIX RECEBIDO', amount: 500, direction: 'CREDIT', type: 'XFER' }),
      ];
      
      const result = TransactionCategorizer.categorizeBatch(transactions);
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.transactions).toHaveLength(3);
        expect(result.value.summary.totalTransactions).toBe(3);
        expect(result.value.summary.categorizedCount).toBeGreaterThan(0);
      }
    });
  });

  describe('normalizeDescription', () => {
    it('deve normalizar descrição removendo caracteres especiais', () => {
      const normalized = TransactionCategorizer.normalizeDescription(
        'PAGTO - FORNECEDOR ABC ***'
      );
      
      expect(normalized).not.toContain('-');
      expect(normalized).not.toContain('*');
    });

    it('deve remover datas da descrição', () => {
      const normalized = TransactionCategorizer.normalizeDescription(
        'COMPRA 15/01/2026 LOJA XYZ'
      );
      
      expect(normalized).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('extractPayeeFromDescription', () => {
    it('deve extrair payee de descrição TED', () => {
      const payee = TransactionCategorizer.extractPayeeFromDescription(
        'TED DE EMPRESA ABC LTDA'
      );
      
      expect(payee).toBeDefined();
    });

    it('deve retornar undefined para descrição sem payee identificável', () => {
      const payee = TransactionCategorizer.extractPayeeFromDescription(
        '123456789'
      );
      
      expect(payee).toBeUndefined();
    });
  });

  describe('createRule', () => {
    it('deve criar regra de categorização personalizada', () => {
      const rule = TransactionCategorizer.createRule(
        'custom-1',
        'Minha Regra',
        'FUEL' as TransactionCategory,
        {
          priority: 200,
          descriptionPatterns: ['meu posto'],
          direction: 'DEBIT',
        }
      );
      
      expect(rule.id).toBe('custom-1');
      expect(rule.category).toBe('FUEL');
      expect(rule.priority).toBe(200);
      expect(rule.descriptionPatterns).toHaveLength(1);
    });
  });

  describe('detection helpers', () => {
    it('deve detectar transação PIX', () => {
      const transaction = createMockTransaction({
        description: 'PIX RECEBIDO CHAVE CPF',
      });
      
      expect(TransactionCategorizer.isPixTransaction(transaction)).toBe(true);
    });

    it('deve detectar transação TED', () => {
      const transaction = createMockTransaction({
        description: 'TED ENVIADA PARA CONTA',
      });
      
      expect(TransactionCategorizer.isTedTransaction(transaction)).toBe(true);
    });

    it('deve detectar transação de salário', () => {
      const transaction = createMockTransaction({
        description: 'CREDITO SALARIO EMPRESA X',
        direction: 'CREDIT',
      });
      
      expect(TransactionCategorizer.isSalaryTransaction(transaction)).toBe(true);
    });

    it('deve detectar pagamento de imposto', () => {
      const transaction = createMockTransaction({
        description: 'DARF IRPJ 2026',
        direction: 'DEBIT',
      });
      
      expect(TransactionCategorizer.isTaxPayment(transaction)).toBe(true);
    });

    it('deve detectar tarifa bancária', () => {
      const transaction = createMockTransaction({
        description: 'TARIFA PACOTE SERVICOS',
        direction: 'DEBIT',
        type: 'FEE',
      });
      
      expect(TransactionCategorizer.isBankFee(transaction)).toBe(true);
    });
  });
});
