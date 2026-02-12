/**
 * Contract Tests: Payables API
 * Valida schemas de input/output das APIs de contas a pagar
 *
 * @module contract/financial
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema que simula o contrato da API V2 de payables
const CreatePayableSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
  dueDate: z.string().transform(v => new Date(v)),
  partnerId: z.string().min(1),
  categoryId: z.string().optional(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

const PayPayableSchema = z.object({
  paymentDate: z.string().transform(v => new Date(v)),
  paymentMethod: z.string().min(1),
  bankAccountId: z.string().optional(),
  interestAmount: z.number().min(0).default(0),
  fineAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

describe('CreatePayable Contract', () => {
  describe('Valid Inputs', () => {
    it('deve aceitar input válido completo', () => {
      const input = {
        description: 'Frete SP-RJ',
        amount: 1500.00,
        currency: 'BRL',
        dueDate: '2026-02-15',
        partnerId: 'partner-001',
        categoryId: 'cat-frete',
        documentNumber: 'NF-12345',
        notes: 'Pagamento quinzenal',
      };
      const result = CreatePayableSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve aceitar input com campos opcionais ausentes', () => {
      const input = {
        description: 'Frete mínimo',
        amount: 100.00,
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      const result = CreatePayableSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve usar BRL como moeda padrão', () => {
      const input = {
        description: 'Teste',
        amount: 50.00,
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      const result = CreatePayableSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('BRL');
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('deve rejeitar description vazia', () => {
      const input = {
        description: '',
        amount: 100.00,
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      expect(CreatePayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar amount negativo', () => {
      const input = {
        description: 'Teste',
        amount: -100.00,
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      expect(CreatePayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar amount zero', () => {
      const input = {
        description: 'Teste',
        amount: 0,
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      expect(CreatePayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar sem partnerId', () => {
      const input = {
        description: 'Teste',
        amount: 100.00,
        dueDate: '2026-03-01',
      };
      expect(CreatePayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar currency com tamanho errado', () => {
      const input = {
        description: 'Teste',
        amount: 100.00,
        currency: 'REAL',
        dueDate: '2026-03-01',
        partnerId: 'p-001',
      };
      expect(CreatePayableSchema.safeParse(input).success).toBe(false);
    });
  });
});

describe('PayPayable Contract', () => {
  describe('Valid Inputs', () => {
    it('deve aceitar pagamento simples', () => {
      const input = {
        paymentDate: '2026-02-15',
        paymentMethod: 'PIX',
      };
      const result = PayPayableSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve aceitar pagamento com juros e multa', () => {
      const input = {
        paymentDate: '2026-02-20',
        paymentMethod: 'BOLETO',
        interestAmount: 15.50,
        fineAmount: 10.00,
        discountAmount: 0,
        bankAccountId: 'bank-001',
      };
      const result = PayPayableSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve usar 0 como default para juros/multa/desconto', () => {
      const input = {
        paymentDate: '2026-02-15',
        paymentMethod: 'TED',
      };
      const result = PayPayableSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interestAmount).toBe(0);
        expect(result.data.fineAmount).toBe(0);
        expect(result.data.discountAmount).toBe(0);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('deve rejeitar sem paymentDate', () => {
      const input = { paymentMethod: 'PIX' };
      expect(PayPayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar sem paymentMethod', () => {
      const input = { paymentDate: '2026-02-15' };
      expect(PayPayableSchema.safeParse(input).success).toBe(false);
    });

    it('deve rejeitar interestAmount negativo', () => {
      const input = {
        paymentDate: '2026-02-15',
        paymentMethod: 'PIX',
        interestAmount: -5,
      };
      expect(PayPayableSchema.safeParse(input).success).toBe(false);
    });
  });
});
