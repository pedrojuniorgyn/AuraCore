import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseReport } from '@/modules/financial/domain/entities/expense/ExpenseReport';
import { ExpenseItem } from '@/modules/financial/domain/entities/expense/ExpenseItem';
import {
  ExpenseReportMapper,
  ExpenseReportPersistence,
  ExpenseItemPersistence,
} from '@/modules/financial/infrastructure/persistence/expense/ExpenseReportMapper';

describe('ExpenseReportMapper', () => {
  const createValidReport = () => {
    const reportResult = ExpenseReport.create({
      id: 'report-1',
      organizationId: 1,
      branchId: 1,
      employeeId: 'emp-1',
      employeeName: 'João Silva',
      costCenterId: 'cc-1',
      periodoInicio: new Date(2025, 0, 1),
      periodoFim: new Date(2025, 0, 5),
      motivo: 'Viagem a trabalho',
      createdBy: 'emp-1',
      updatedBy: 'emp-1',
    });

    if (Result.isFail(reportResult)) {
      throw new Error('Failed to create report');
    }

    return reportResult.value;
  };

  const createValidItem = () => {
    return ExpenseItem.create({
      id: 'item-1',
      expenseReportId: 'report-1',
      categoria: 'ALIMENTACAO',
      data: new Date(2025, 0, 2),
      descricao: 'Almoço executivo',
      valor: Money.create(80, 'BRL').value,
    }).value;
  };

  describe('toPersistence', () => {
    it('should map report to persistence', () => {
      const report = createValidReport();
      const persistence = ExpenseReportMapper.toPersistence(report);

      expect(persistence.id).toBe('report-1');
      expect(persistence.organizationId).toBe(1);
      expect(persistence.branchId).toBe(1);
      expect(persistence.employeeId).toBe('emp-1');
      expect(persistence.totalDespesasAmount).toBe('0.00');
      expect(persistence.totalDespesasCurrency).toBe('BRL');
      expect(persistence.status).toBe('DRAFT');
    });

    it('should map advance if present', () => {
      const report = createValidReport();
      const advanceMoney = Money.create(500, 'BRL').value;
      report.requestAdvance(advanceMoney);

      const persistence = ExpenseReportMapper.toPersistence(report);

      expect(persistence.advanceValorSolicitadoAmount).toBe('500.00');
      expect(persistence.advanceValorSolicitadoCurrency).toBe('BRL');
      expect(persistence.advanceStatusAprovacao).toBe('PENDING');
    });
  });

  describe('toDomain', () => {
    it('should map from persistence to domain', () => {
      const persistence: ExpenseReportPersistence = {
        id: 'report-1',
        organizationId: 1,
        branchId: 1,
        employeeId: 'emp-1',
        employeeName: 'João Silva',
        costCenterId: 'cc-1',
        periodoInicio: new Date(2025, 0, 1),
        periodoFim: new Date(2025, 0, 5),
        motivo: 'Viagem a trabalho',
        projeto: null,
        advanceValorSolicitadoAmount: null,
        advanceValorSolicitadoCurrency: null,
        advanceDataSolicitacao: null,
        advanceStatusAprovacao: null,
        advanceValorAprovadoAmount: null,
        advanceValorAprovadoCurrency: null,
        advanceDataLiberacao: null,
        advanceAprovadorId: null,
        totalDespesasAmount: '0.00',
        totalDespesasCurrency: 'BRL',
        saldoAmount: '0.00',
        saldoCurrency: 'BRL',
        status: 'DRAFT',
        submittedAt: null,
        reviewerId: null,
        reviewedAt: null,
        reviewNotes: null,
        payableId: null,
        createdAt: new Date(),
        createdBy: 'emp-1',
        updatedAt: new Date(),
        updatedBy: 'emp-1',
        deletedAt: null,
      };

      const result = ExpenseReportMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('report-1');
        expect(result.value.status).toBe('DRAFT');
      }
    });

    it('should reconstitute advance if present', () => {
      const persistence: ExpenseReportPersistence = {
        id: 'report-1',
        organizationId: 1,
        branchId: 1,
        employeeId: 'emp-1',
        employeeName: 'João Silva',
        costCenterId: 'cc-1',
        periodoInicio: new Date(2025, 0, 1),
        periodoFim: new Date(2025, 0, 5),
        motivo: 'Viagem a trabalho',
        projeto: null,
        advanceValorSolicitadoAmount: '500.00',
        advanceValorSolicitadoCurrency: 'BRL',
        advanceDataSolicitacao: new Date(),
        advanceStatusAprovacao: 'PENDING',
        advanceValorAprovadoAmount: null,
        advanceValorAprovadoCurrency: null,
        advanceDataLiberacao: null,
        advanceAprovadorId: null,
        totalDespesasAmount: '0.00',
        totalDespesasCurrency: 'BRL',
        saldoAmount: '-500.00',
        saldoCurrency: 'BRL',
        status: 'DRAFT',
        submittedAt: null,
        reviewerId: null,
        reviewedAt: null,
        reviewNotes: null,
        payableId: null,
        createdAt: new Date(),
        createdBy: 'emp-1',
        updatedAt: new Date(),
        updatedBy: 'emp-1',
        deletedAt: null,
      };

      const result = ExpenseReportMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.advance).toBeDefined();
        expect(result.value.advance?.statusAprovacao).toBe('PENDING');
      }
    });
  });

  describe('itemToPersistence', () => {
    it('should map item to persistence', () => {
      const item = createValidItem();
      const persistence = ExpenseReportMapper.itemToPersistence(item);

      expect(persistence.id).toBe('item-1');
      expect(persistence.expenseReportId).toBe('report-1');
      expect(persistence.categoria).toBe('ALIMENTACAO');
      expect(persistence.valorAmount).toBe('80.00');
      expect(persistence.dentroPolitica).toBe(true);
    });
  });

  describe('itemToDomain', () => {
    it('should map item from persistence', () => {
      const persistence: ExpenseItemPersistence = {
        id: 'item-1',
        expenseReportId: 'report-1',
        categoria: 'ALIMENTACAO',
        data: new Date(2025, 0, 2),
        descricao: 'Almoço executivo',
        valorAmount: '80.00',
        valorCurrency: 'BRL',
        comprovanteType: null,
        comprovanteNumero: null,
        comprovanteUrl: null,
        dentroPolitica: true,
        motivoViolacao: null,
      };

      const result = ExpenseReportMapper.itemToDomain(persistence);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('item-1');
        expect(result.value.categoria).toBe('ALIMENTACAO');
        expect(result.value.valor.amount).toBe(80);
      }
    });
  });
});

