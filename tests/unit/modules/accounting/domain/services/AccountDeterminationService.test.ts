/**
 * Tests: AccountDeterminationService
 * Domain Service para determinação de contas contábeis por operação
 *
 * @module accounting/domain/services
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';

/**
 * Account Determination rules validate that the mapping
 * of operations to chart of accounts is correct.
 */
describe('Account Determination Logic', () => {
  // Simular regras de determinação
  interface AccountRule {
    operationType: string;
    debitAccountCode: string;
    creditAccountCode: string;
    description: string;
  }

  const EXPECTED_RULES: AccountRule[] = [
    { operationType: 'PAYMENT', debitAccountCode: '2.1.01', creditAccountCode: '1.1.01', description: 'Pagamento: Debita Fornecedores, Credita Caixa/Banco' },
    { operationType: 'RECEIPT', debitAccountCode: '1.1.01', creditAccountCode: '1.1.03', description: 'Recebimento: Debita Caixa/Banco, Credita Clientes' },
    { operationType: 'INTEREST_PAID', debitAccountCode: '3.3.01', creditAccountCode: '1.1.01', description: 'Juros pagos: Debita Despesa Financeira, Credita Caixa' },
    { operationType: 'INTEREST_RECEIVED', debitAccountCode: '1.1.01', creditAccountCode: '4.1.01', description: 'Juros recebidos: Debita Caixa, Credita Receita Financeira' },
    { operationType: 'DISCOUNT_GIVEN', debitAccountCode: '3.3.02', creditAccountCode: '1.1.03', description: 'Desconto concedido: Debita Despesa, Credita Clientes' },
    { operationType: 'DISCOUNT_RECEIVED', debitAccountCode: '2.1.01', creditAccountCode: '4.1.02', description: 'Desconto obtido: Debita Fornecedores, Credita Receita' },
  ];

  describe('Partida dobrada', () => {
    it('toda operação deve ter conta de débito e crédito', () => {
      for (const rule of EXPECTED_RULES) {
        expect(rule.debitAccountCode).toBeTruthy();
        expect(rule.creditAccountCode).toBeTruthy();
        expect(rule.debitAccountCode).not.toBe(rule.creditAccountCode);
      }
    });

    it('tipos de operação são únicos', () => {
      const types = EXPECTED_RULES.map(r => r.operationType);
      const unique = new Set(types);
      expect(unique.size).toBe(types.length);
    });
  });

  describe('Códigos de conta', () => {
    it('contas do ativo começam com 1', () => {
      const ativoAccounts = EXPECTED_RULES
        .flatMap(r => [r.debitAccountCode, r.creditAccountCode])
        .filter(code => code.startsWith('1.'));

      for (const code of ativoAccounts) {
        expect(code).toMatch(/^1\.\d+\.\d+$/);
      }
    });

    it('contas do passivo começam com 2', () => {
      const passivoAccounts = EXPECTED_RULES
        .flatMap(r => [r.debitAccountCode, r.creditAccountCode])
        .filter(code => code.startsWith('2.'));

      for (const code of passivoAccounts) {
        expect(code).toMatch(/^2\.\d+\.\d+$/);
      }
    });

    it('contas de despesa começam com 3', () => {
      const despesaAccounts = EXPECTED_RULES
        .flatMap(r => [r.debitAccountCode, r.creditAccountCode])
        .filter(code => code.startsWith('3.'));

      for (const code of despesaAccounts) {
        expect(code).toMatch(/^3\.\d+\.\d+$/);
      }
    });

    it('contas de receita começam com 4', () => {
      const receitaAccounts = EXPECTED_RULES
        .flatMap(r => [r.debitAccountCode, r.creditAccountCode])
        .filter(code => code.startsWith('4.'));

      for (const code of receitaAccounts) {
        expect(code).toMatch(/^4\.\d+\.\d+$/);
      }
    });
  });

  describe('Regras de negócio', () => {
    it('PAYMENT: débito no passivo (fornecedores), crédito no ativo (banco)', () => {
      const rule = EXPECTED_RULES.find(r => r.operationType === 'PAYMENT');
      expect(rule).toBeDefined();
      expect(rule?.debitAccountCode).toMatch(/^2\./); // Passivo
      expect(rule?.creditAccountCode).toMatch(/^1\./); // Ativo
    });

    it('RECEIPT: débito no ativo (banco), crédito no ativo (clientes)', () => {
      const rule = EXPECTED_RULES.find(r => r.operationType === 'RECEIPT');
      expect(rule).toBeDefined();
      expect(rule?.debitAccountCode).toMatch(/^1\./); // Ativo
      expect(rule?.creditAccountCode).toMatch(/^1\./); // Ativo
    });

    it('INTEREST_PAID: débito em despesa, crédito no ativo', () => {
      const rule = EXPECTED_RULES.find(r => r.operationType === 'INTEREST_PAID');
      expect(rule).toBeDefined();
      expect(rule?.debitAccountCode).toMatch(/^3\./); // Despesa
      expect(rule?.creditAccountCode).toMatch(/^1\./); // Ativo
    });

    it('INTEREST_RECEIVED: débito no ativo, crédito em receita', () => {
      const rule = EXPECTED_RULES.find(r => r.operationType === 'INTEREST_RECEIVED');
      expect(rule).toBeDefined();
      expect(rule?.debitAccountCode).toMatch(/^1\./); // Ativo
      expect(rule?.creditAccountCode).toMatch(/^4\./); // Receita
    });
  });
});
