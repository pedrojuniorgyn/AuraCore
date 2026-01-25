import { describe, it, expect, beforeEach } from 'vitest';
import { AccountPayable } from '@/modules/financial/domain/entities/AccountPayable';
import { Payment } from '@/modules/financial/domain/entities/Payment';
import { PaymentTerms } from '@/modules/financial/domain/value-objects/PaymentTerms';
import { Money, Result } from '@/shared/domain';

describe('AccountPayable', () => {
  let validTerms: PaymentTerms;
  let validMoney: Money;

  beforeEach(() => {
    const moneyResult = Money.create(1000);
    if (Result.isOk(moneyResult)) {
      validMoney = moneyResult.value;
    }

    // Usar data bem no futuro para evitar cálculo de multa/juros
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 ano no futuro

    const termsResult = PaymentTerms.create({
      dueDate: futureDate,
      amount: validMoney,
    });
    if (Result.isOk(termsResult)) {
      validTerms = termsResult.value;
    }
  });

  describe('create', () => {
    it('should create valid AccountPayable', () => {
      const result = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Compra de materiais',
        terms: validTerms,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('OPEN');
        expect(result.value.version).toBe(1);
        expect(result.value.domainEvents.length).toBe(1);
      }
    });

    it('should fail without id', () => {
      const result = AccountPayable.create({
        id: '',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without organizationId', () => {
      const result = AccountPayable.create({
        id: 'pay-001',
        organizationId: 0,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without valid supplierId', () => {
      const result = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 0,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Supplier');
      }
    });

    it('should fail with negative supplierId', () => {
      const result = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: -1,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('registerPayment', () => {
    it('should register payment and update status to PAID when payment is CONFIRMED', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          payment.confirm();
          
          const result = payable.registerPayment(payment);
          
          expect(Result.isOk(result)).toBe(true);
          expect(payable.status).toBe('PAID');
          // ✅ S1.3-APP: getTotalPaid() retorna Result<Money, string>
          const totalPaidResult = payable.getTotalPaid();
          expect(Result.isOk(totalPaidResult)).toBe(true);
          expect(totalPaidResult.value.amount).toBe(validMoney.amount);
          expect(payable.domainEvents.length).toBe(2); // Created + PaymentCompleted
        }
      }
    });

    it('should NOT change status to PAID for PENDING payment', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          // Payment is PENDING by default
          expect(payment.status).toBe('PENDING');
          
          const result = payable.registerPayment(payment);
          
          expect(Result.isOk(result)).toBe(true);
          // Status should still be OPEN because payment is not confirmed
          expect(payable.status).toBe('OPEN');
          // ✅ S1.3-APP: getTotalPaid() retorna Result<Money, string>
          const totalPaidResult = payable.getTotalPaid();
          expect(Result.isOk(totalPaidResult)).toBe(true);
          expect(totalPaidResult.value.amount).toBe(0);
        }
      }
    });

    it('should not allow payment on CANCELLED payable', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        payable.cancel('Test cancellation', 'user-001');

        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const result = payable.registerPayment(paymentResult.value);
          expect(Result.isFail(result)).toBe(true);
        }
      }
    });
  });

  describe('confirmPayment', () => {
    it('should change status to PAID after confirmPayment', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          
          // Register (PENDING)
          payable.registerPayment(payment);
          expect(payable.status).toBe('OPEN');
          // ✅ S1.3-APP: getTotalPaid() retorna Result<Money, string>
          let totalPaidResult = payable.getTotalPaid();
          expect(Result.isOk(totalPaidResult)).toBe(true);
          expect(totalPaidResult.value.amount).toBe(0);
          
          // Confirm payment
          const confirmResult = payable.confirmPayment('pmt-001', 'TXN-123');
          expect(Result.isOk(confirmResult)).toBe(true);
          
          // Now should be PAID
          expect(payable.status).toBe('PAID');
          totalPaidResult = payable.getTotalPaid();
          expect(Result.isOk(totalPaidResult)).toBe(true);
          expect(totalPaidResult.value.amount).toBe(validMoney.amount);
          expect(payable.domainEvents.length).toBe(2); // Created + PaymentCompleted
        }
      }
    });

    it('should fail to confirm non-existent payment', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const confirmResult = payable.confirmPayment('non-existent', 'TXN-123');
        expect(Result.isFail(confirmResult)).toBe(true);
        if (Result.isFail(confirmResult)) {
          expect(confirmResult.error).toContain('not found');
        }
      }
    });
  });

  describe('cancelPayment', () => {
    it('should recalculate status when payment is cancelled', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          
          // Register PENDING payment
          payable.registerPayment(payment);
          expect(payable.status).toBe('OPEN');
          
          // Cancel payment should succeed (PENDING can be cancelled)
          const cancelResult = payable.cancelPayment('pmt-001', 'Test cancellation');
          expect(Result.isOk(cancelResult)).toBe(true);
          expect(payable.status).toBe('OPEN'); // Still OPEN
        }
      }
    });

    it('should fail to cancel CONFIRMED payment', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          
          // Register and confirm
          payable.registerPayment(payment);
          payable.confirmPayment('pmt-001');
          expect(payable.status).toBe('PAID');
          
          // Cancel should fail (already confirmed)
          const cancelResult = payable.cancelPayment('pmt-001', 'Test');
          expect(Result.isFail(cancelResult)).toBe(true);
          if (Result.isFail(cancelResult)) {
            expect(cancelResult.error).toContain('confirmed');
          }
        }
      }
    });
  });

  describe('cancel', () => {
    it('should cancel OPEN payable', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        const result = payable.cancel('Duplicated', 'user-001');

        expect(Result.isOk(result)).toBe(true);
        expect(payable.status).toBe('CANCELLED');
      }
    });

    it('should not cancel PAID payable', () => {
      // Create and pay
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          payment.confirm();
          payable.registerPayment(payment);

          const result = payable.cancel('Test', 'user-001');
          expect(Result.isFail(result)).toBe(true);
        }
      }
    });

    it('should NOT cancel PARTIAL payable with confirmed payments', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms, // R$ 1000
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        // Pagamento parcial CONFIRMADO
        const partialMoneyResult = Money.create(500);
        if (Result.isOk(partialMoneyResult)) {
          const paymentResult = Payment.create({
            id: 'pmt-001',
            payableId: 'pay-001',
            amount: partialMoneyResult.value,
            method: 'PIX',
          });

          if (Result.isOk(paymentResult)) {
            const payment = paymentResult.value;
            payment.confirm(); // CONFIRMED
            payable.registerPayment(payment);
            
            expect(payable.status).toBe('PARTIAL');
            // ✅ S1.3-APP: getTotalPaid() retorna Result<Money, string>
            const totalPaidResult = payable.getTotalPaid();
            expect(Result.isOk(totalPaidResult)).toBe(true);
            expect(totalPaidResult.value.amount).toBe(500);

            // Tentar cancelar deve FALHAR
            const result = payable.cancel('Test', 'user-001');
            expect(Result.isFail(result)).toBe(true);
            if (Result.isFail(result)) {
              expect(result.error).toContain('confirmed payment');
            }
            
            // Status não deve mudar
            expect(payable.status).toBe('PARTIAL');
          }
        }
      }
    });

    it('should cancel payable with only PENDING payments', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        // Pagamento PENDING (não confirmado)
        const paymentResult = Payment.create({
          id: 'pmt-001',
          payableId: 'pay-001',
          amount: validMoney,
          method: 'PIX',
        });

        if (Result.isOk(paymentResult)) {
          const payment = paymentResult.value;
          // NÃO confirmar - mantém PENDING
          payable.registerPayment(payment);
          
          expect(payable.status).toBe('OPEN'); // PENDING não muda status
          expect(payable.payments.length).toBe(1);
          expect(payable.payments[0].status).toBe('PENDING');

          // Cancelar deve FUNCIONAR
          const result = payable.cancel('Changed mind', 'user-001');
          expect(Result.isOk(result)).toBe(true);
          expect(payable.status).toBe('CANCELLED');
          expect(payable.payments[0].status).toBe('CANCELLED');
        }
      }
    });
  });

  describe('remainingAmount', () => {
    it('should return correct remaining amount for unpaid payable', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        // Inicialmente, remaining = total due
        // ✅ S1.3-APP: getRemainingAmount() retorna Result<Money, string>
        const remainingResult = payable.getRemainingAmount();
        expect(Result.isOk(remainingResult)).toBe(true);
        expect(remainingResult.value.amount).toBe(validMoney.amount);
      }
    });

    it('should return correct remaining amount after partial payment', () => {
      const payableResult = AccountPayable.create({
        id: 'pay-001',
        organizationId: 1,
        branchId: 1,
        supplierId: 100,
        documentNumber: 'NF-12345',
        description: 'Test',
        terms: validTerms,
      });

      if (Result.isOk(payableResult)) {
        const payable = payableResult.value;
        
        // Pagamento parcial de 500
        const partialMoneyResult = Money.create(500);
        if (Result.isOk(partialMoneyResult)) {
          const paymentResult = Payment.create({
            id: 'pmt-001',
            payableId: 'pay-001',
            amount: partialMoneyResult.value,
            method: 'PIX',
          });

          if (Result.isOk(paymentResult)) {
            const payment = paymentResult.value;
            payment.confirm();
            payable.registerPayment(payment);
            
            // Remaining should be 1000 - 500 = 500
            // ✅ S1.3-APP: getRemainingAmount() retorna Result<Money, string>
            const remainingResult = payable.getRemainingAmount();
            expect(Result.isOk(remainingResult)).toBe(true);
            expect(remainingResult.value.amount).toBe(500);
            expect(payable.status).toBe('PARTIAL');
          }
        }
      }
    });

    it('should include fines and interest in remaining for overdue payables', () => {
      // Criar payable com data de vencimento no passado
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1); // 1 mês atrás
      
      const termsResult = PaymentTerms.create({
        dueDate: pastDate,
        amount: validMoney,
        fineRate: 2,      // 2% multa
        interestRate: 1,  // 1% juros/mês
      });

      if (Result.isOk(termsResult)) {
        const payableResult = AccountPayable.create({
          id: 'pay-002',
          organizationId: 1,
          branchId: 1,
          supplierId: 100,
          documentNumber: 'NF-12346',
          description: 'Overdue Test',
          terms: termsResult.value,
        });

        if (Result.isOk(payableResult)) {
          const payable = payableResult.value;
          
          // remainingAmount deve incluir multa e juros
          // Original: 1000
          // Multa (2%): 20
          // Juros (~30 dias * 1%/30): ~10
          // Total aproximado: > 1000
          // ✅ S1.3-APP: getRemainingAmount() retorna Result<Money, string>
          const remainingResult = payable.getRemainingAmount();
          expect(Result.isOk(remainingResult)).toBe(true);
          expect(remainingResult.value.amount).toBeGreaterThan(validMoney.amount);
          expect(payable.isOverdue).toBe(true);
        }
      }
    });
  });
});

