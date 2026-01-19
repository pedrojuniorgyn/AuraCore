import { describe, it, expect } from 'vitest';
import { BankStatementValidator } from '@/modules/financial/domain/services/bank-statement/BankStatementValidator';
import { Result } from '@/shared/domain';
import { 
  createMockStatement, 
  createMockTransaction,
  createDuplicateTransactions,
} from '../../../../../../fixtures/financial/bank-statement-fixtures';

describe('BankStatementValidator', () => {
  describe('validate', () => {
    it('deve validar um statement completo com sucesso', () => {
      const statement = createMockStatement();
      const result = BankStatementValidator.validate(statement);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve gerar warning se não houver transações', () => {
      const statement = createMockStatement({ transactions: [] });
      const result = BankStatementValidator.validate(statement);
      
      expect(result.warnings.some(w => w.code === 'NO_TRANSACTIONS')).toBe(true);
    });

    it('deve gerar erro se período for inválido (start > end)', () => {
      const statement = createMockStatement({
        period: {
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-01'),
          generatedAt: new Date(),
        },
      });
      
      const result = BankStatementValidator.validate(statement);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PERIOD')).toBe(true);
    });

    it('deve gerar erro se número da conta estiver ausente', () => {
      const statement = createMockStatement({
        account: {
          bankCode: '341',
          branchCode: '0001',
          accountNumber: '', // Vazio
          accountType: 'CHECKING',
          currency: 'BRL',
        },
      });
      
      const result = BankStatementValidator.validate(statement);
      
      expect(result.errors.some(e => e.code === 'MISSING_ACCOUNT_NUMBER')).toBe(true);
    });

    it('deve gerar warning se período for muito longo (> 365 dias)', () => {
      const statement = createMockStatement({
        period: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-06-01'), // > 1 ano
          generatedAt: new Date(),
        },
      });
      
      const result = BankStatementValidator.validate(statement);
      
      expect(result.warnings.some(w => w.code === 'LONG_PERIOD')).toBe(true);
    });

    it('deve gerar warning se saldo calculado diferir do informado', () => {
      const statement = createMockStatement({
        balance: {
          openingBalance: 1000.00,
          closingBalance: 5000.00, // Não bate com transações
          currency: 'BRL',
          asOfDate: new Date(),
        },
      });
      
      const result = BankStatementValidator.validate(statement);
      
      expect(result.warnings.some(w => w.code === 'BALANCE_MISMATCH')).toBe(true);
    });
  });

  describe('checkInternalDuplicates', () => {
    it('deve detectar transações com mesmo FIT ID', () => {
      const transactions = createDuplicateTransactions();
      const result = BankStatementValidator.checkInternalDuplicates(transactions);
      
      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates.length).toBeGreaterThan(0);
    });

    it('não deve detectar duplicatas em lista única', () => {
      // Each transaction must have unique date+amount+description combo
      const transactions = [
        createMockTransaction({ 
          fitId: 'UNIQUE1', 
          transactionDate: new Date('2026-01-01'),
          amount: 100,
          description: 'TRANSACAO A',
        }),
        createMockTransaction({ 
          fitId: 'UNIQUE2', 
          transactionDate: new Date('2026-01-02'),
          amount: 200,
          description: 'TRANSACAO B',
        }),
        createMockTransaction({ 
          fitId: 'UNIQUE3', 
          transactionDate: new Date('2026-01-03'),
          amount: 300,
          description: 'TRANSACAO C',
        }),
      ];
      
      const result = BankStatementValidator.checkInternalDuplicates(transactions);
      
      expect(result.hasDuplicates).toBe(false);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('checkExternalDuplicates', () => {
    it('deve detectar transações que já existem', () => {
      const existingTransactions = [
        createMockTransaction({ 
          fitId: 'EXISTING1',
          transactionDate: new Date('2026-01-01'),
          amount: 100,
          description: 'TRANSACAO EXISTENTE',
        }),
      ];
      
      const newTransactions = [
        createMockTransaction({ 
          fitId: 'EXISTING1', // Same ID = duplicate
          transactionDate: new Date('2026-01-05'),
          amount: 500,
          description: 'TRANSACAO DIFERENTE',
        }),
        createMockTransaction({ 
          fitId: 'NEW1',
          transactionDate: new Date('2026-01-10'),
          amount: 200,
          description: 'TRANSACAO NOVA',
        }),
      ];
      
      const result = BankStatementValidator.checkExternalDuplicates(
        newTransactions,
        existingTransactions
      );
      
      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates.length).toBeGreaterThanOrEqual(1);
    });

    it('não deve detectar duplicatas se não houver correspondência', () => {
      const existingTransactions = [
        createMockTransaction({ 
          fitId: 'EXISTING1',
          transactionDate: new Date('2026-01-01'),
          amount: 100,
          description: 'TRANSACAO ANTIGA',
        }),
      ];
      
      const newTransactions = [
        createMockTransaction({ 
          fitId: 'NEW1',
          transactionDate: new Date('2026-02-01'),
          amount: 999,
          description: 'TRANSACAO NOVA 1',
        }),
        createMockTransaction({ 
          fitId: 'NEW2',
          transactionDate: new Date('2026-02-02'),
          amount: 888,
          description: 'TRANSACAO NOVA 2',
        }),
      ];
      
      const result = BankStatementValidator.checkExternalDuplicates(
        newTransactions,
        existingTransactions
      );
      
      expect(result.hasDuplicates).toBe(false);
    });
  });

  describe('validateBrazilianAccount', () => {
    it('deve validar conta brasileira correta', () => {
      const result = BankStatementValidator.validateBrazilianAccount(
        '341',
        '0001',
        '123456'
      );
      
      expect(Result.isOk(result)).toBe(true);
    });

    it('deve rejeitar código de banco inválido', () => {
      const result = BankStatementValidator.validateBrazilianAccount(
        '12', // Deve ter 3 dígitos
        '0001',
        '123456'
      );
      
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('validateCNPJ', () => {
    it('deve validar CNPJ correto', () => {
      const result = BankStatementValidator.validateCNPJ('11.222.333/0001-81');
      expect(result).toBe(true);
    });

    it('deve rejeitar CNPJ com dígitos repetidos', () => {
      const result = BankStatementValidator.validateCNPJ('11.111.111/1111-11');
      expect(result).toBe(false);
    });

    it('deve rejeitar CNPJ com tamanho errado', () => {
      const result = BankStatementValidator.validateCNPJ('11.222.333/0001');
      expect(result).toBe(false);
    });
  });

  describe('validateCPF', () => {
    it('deve validar CPF correto', () => {
      const result = BankStatementValidator.validateCPF('529.982.247-25');
      expect(result).toBe(true);
    });

    it('deve rejeitar CPF com dígitos repetidos', () => {
      const result = BankStatementValidator.validateCPF('111.111.111-11');
      expect(result).toBe(false);
    });

    it('deve rejeitar CPF com tamanho errado', () => {
      const result = BankStatementValidator.validateCPF('529.982.247');
      expect(result).toBe(false);
    });
  });
});
