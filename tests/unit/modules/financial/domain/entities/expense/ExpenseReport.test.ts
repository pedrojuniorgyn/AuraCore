import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseReport } from '@/modules/financial/domain/entities/expense/ExpenseReport';
import { ExpenseItem } from '@/modules/financial/domain/entities/expense/ExpenseItem';

describe('ExpenseReport', () => {
  const createValidProps = () => ({
    id: 'report-1',
    organizationId: 1,
    branchId: 1,
    employeeId: 'emp-1',
    employeeName: 'João Silva',
    costCenterId: 'cc-1',
    periodoInicio: new Date(2025, 0, 1),
    periodoFim: new Date(2025, 0, 5),
    motivo: 'Visita a cliente em SP',
    createdBy: 'emp-1',
    updatedBy: 'emp-1',
  });

  const createValidItem = () => {
    return ExpenseItem.create({
      id: 'item-1',
      expenseReportId: 'report-1',
      categoria: 'ALIMENTACAO',
      data: new Date(),
      descricao: 'Almoço',
      valor: Money.create(80, 'BRL').value,
    }).value;
  };

  describe('create', () => {
    it('should create report with status DRAFT', () => {
      const result = ExpenseReport.create(createValidProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.items.length).toBe(0);
      }
    });

    it('should fail without id', () => {
      const props = createValidProps();
      props.id = '';

      const result = ExpenseReport.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Expense Report ID is required');
      }
    });

    it('should fail if organizationId <= 0', () => {
      const props = createValidProps();
      props.organizationId = 0;

      const result = ExpenseReport.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Organization ID');
      }
    });

    it('should fail if branchId <= 0', () => {
      const props = createValidProps();
      props.branchId = 0;

      const result = ExpenseReport.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Branch ID');
      }
    });

    it('should fail if periodoFim < periodoInicio', () => {
      const props = createValidProps();
      props.periodoFim = new Date(2024, 11, 31);

      const result = ExpenseReport.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Período fim');
      }
    });

    it('should fail without motivo', () => {
      const props = createValidProps();
      props.motivo = '';

      const result = ExpenseReport.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Motivo is required');
      }
    });
  });

  describe('addItem', () => {
    it('should add item and recalculate totals', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();

      const result = report.addItem(item);

      expect(Result.isOk(result)).toBe(true);
      expect(report.items.length).toBe(1);
      expect(report.totalDespesas.amount).toBe(80);
    });

    it('should fail if status != DRAFT', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();

      report.addItem(item);
      report.submit();

      const result = report.addItem(item);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot add item');
      }
    });
  });

  describe('removeItem', () => {
    it('should remove item and recalculate totals', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();

      report.addItem(item);
      const result = report.removeItem(item.id);

      expect(Result.isOk(result)).toBe(true);
      expect(report.items.length).toBe(0);
      expect(report.totalDespesas.amount).toBe(0);
    });
  });

  describe('requestAdvance', () => {
    it('should request advance', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const money = Money.create(500, 'BRL').value;

      const result = report.requestAdvance(money);

      expect(Result.isOk(result)).toBe(true);
      expect(report.advance).toBeDefined();
      expect(report.advance?.statusAprovacao).toBe('PENDING');
    });

    it('should fail if advance already requested', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const money = Money.create(500, 'BRL').value;

      report.requestAdvance(money);
      const result = report.requestAdvance(money);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Advance already requested');
      }
    });
  });

  describe('submit', () => {
    it('should submit report', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);

      const result = report.submit();

      expect(Result.isOk(result)).toBe(true);
      expect(report.status).toBe('SUBMITTED');
      expect(report.submittedAt).toBeDefined();
    });

    it('should fail if empty', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;

      const result = report.submit();

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot submit empty');
      }
    });

    it('should fail if status != DRAFT', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);
      report.submit();

      const result = report.submit();

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('invalid status transition');
      }
    });
  });

  describe('approve', () => {
    it('should approve report', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);
      report.submit();

      const result = report.approve('reviewer-1', 'Aprovado');

      expect(Result.isOk(result)).toBe(true);
      expect(report.status).toBe('APPROVED');
      expect(report.reviewerId).toBe('reviewer-1');
    });

    it('should fail without reviewerId', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);
      report.submit();

      const result = report.approve('', 'Aprovado');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Reviewer ID is required');
      }
    });
  });

  describe('reject', () => {
    it('should reject report', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);
      report.submit();

      const result = report.reject('reviewer-1', 'Faltam comprovantes');

      expect(Result.isOk(result)).toBe(true);
      expect(report.status).toBe('REJECTED');
      expect(report.reviewNotes).toBe('Faltam comprovantes');
    });

    it('should fail with short notes', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      const item = createValidItem();
      report.addItem(item);
      report.submit();

      const result = report.reject('reviewer-1', 'Erro');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('at least 10 characters');
      }
    });
  });

  describe('calculateTotals', () => {
    it('should calculate saldo with advance', () => {
      const reportResult = ExpenseReport.create(createValidProps());
      if (Result.isFail(reportResult)) return;

      const report = reportResult.value;
      
      // Solicitar adiantamento
      const advanceMoney = Money.create(500, 'BRL').value;
      report.requestAdvance(advanceMoney);
      
      // Aprovar adiantamento
      const approvedMoney = Money.create(400, 'BRL').value;
      report.approveAdvance(approvedMoney, 'approver-1');

      // Adicionar despesa
      const item = createValidItem(); // R$ 80
      report.addItem(item);

      // Saldo = 80 - 400 = -320 (deve devolver)
      expect(report.saldo.amount).toBe(-320);
    });
  });
});

