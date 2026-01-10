import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { Advance, AdvanceApprovalStatus } from '@/modules/financial/domain/value-objects/expense/Advance';

describe('Advance', () => {
  const createValidMoney = () => Money.create(1000, 'BRL').value;

  describe('create', () => {
    it('should create advance with PENDING status', () => {
      const money = createValidMoney();
      const result = Advance.create(money, new Date());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.statusAprovacao).toBe('PENDING');
        expect(result.value.valorSolicitado.amount).toBe(1000);
      }
    });

    it('should fail if valor <= 0', () => {
      const moneyResult = Money.create(0, 'BRL');
      if (Result.isFail(moneyResult)) return;

      const result = Advance.create(moneyResult.value, new Date());

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('greater than 0');
      }
    });
  });

  describe('approve', () => {
    it('should approve advance', () => {
      const money = createValidMoney();
      const advanceResult = Advance.create(money, new Date());
      if (Result.isFail(advanceResult)) return;

      const advance = advanceResult.value;
      const approvedAmount = Money.create(800, 'BRL').value;
      const approveResult = advance.approve(approvedAmount, 'reviewer-1');

      expect(Result.isOk(approveResult)).toBe(true);
      if (Result.isOk(approveResult)) {
        expect(approveResult.value.statusAprovacao).toBe('APPROVED');
        expect(approveResult.value.valorAprovado?.amount).toBe(800);
        expect(approveResult.value.aprovadorId).toBe('reviewer-1');
      }
    });

    it('should fail if not PENDING', () => {
      const money = createValidMoney();
      const advanceResult = Advance.create(money, new Date());
      if (Result.isFail(advanceResult)) return;

      const advance = advanceResult.value;
      const approvedAmount = Money.create(800, 'BRL').value;
      const approvedAdvanceResult = advance.approve(approvedAmount, 'reviewer-1');
      if (Result.isFail(approvedAdvanceResult)) return;

      const approvedAdvance = approvedAdvanceResult.value;

      // Tentar aprovar novamente
      const result = approvedAdvance.approve(approvedAmount, 'reviewer-2');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot approve');
      }
    });

    it('should fail without aprovadorId', () => {
      const money = createValidMoney();
      const advanceResult = Advance.create(money, new Date());
      if (Result.isFail(advanceResult)) return;

      const advance = advanceResult.value;
      const approvedAmount = Money.create(800, 'BRL').value;
      const result = advance.approve(approvedAmount, '');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Aprovador ID is required');
      }
    });
  });

  describe('reject', () => {
    it('should reject advance', () => {
      const money = createValidMoney();
      const advanceResult = Advance.create(money, new Date());
      if (Result.isFail(advanceResult)) return;

      const advance = advanceResult.value;
      const rejectResult = advance.reject('reviewer-1');

      expect(Result.isOk(rejectResult)).toBe(true);
      if (Result.isOk(rejectResult)) {
        expect(rejectResult.value.statusAprovacao).toBe('REJECTED');
        expect(rejectResult.value.aprovadorId).toBe('reviewer-1');
      }
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute valid advance', () => {
      const money = createValidMoney();
      const props = {
        valorSolicitado: money,
        dataSolicitacao: new Date(),
        statusAprovacao: 'APPROVED' as const,
        valorAprovado: money,
        dataLiberacao: new Date(),
        aprovadorId: 'approver-1',
      };

      const result = Advance.reconstitute(props);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.statusAprovacao).toBe('APPROVED');
      }
    });

    it('should fail with invalid status', () => {
      const money = createValidMoney();
      const props = {
        valorSolicitado: money,
        dataSolicitacao: new Date(),
        statusAprovacao: 'INVALID_STATUS' as AdvanceApprovalStatus,
      };

      const result = Advance.reconstitute(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid advance status');
      }
    });

    it('should fail with valor <= 0', () => {
      const zeroMoney = Money.create(0, 'BRL').value;
      const props = {
        valorSolicitado: zeroMoney,
        dataSolicitacao: new Date(),
        statusAprovacao: 'PENDING' as const,
      };

      const result = Advance.reconstitute(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('greater than 0');
      }
    });
  });
});

