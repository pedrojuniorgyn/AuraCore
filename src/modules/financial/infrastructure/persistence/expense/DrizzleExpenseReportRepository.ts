import { injectable } from '@/shared/infrastructure/di/container';
import { eq, and, gte, lte, isNull, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import {
  IExpenseReportRepository,
  FindExpenseReportsFilters,
} from '../../../domain/ports/output/IExpenseReportRepository';
import { ExpenseReport } from '../../../domain/entities/expense/ExpenseReport';
import {
  ExpenseReportMapper,
  ExpenseReportPersistence,
  ExpenseItemPersistence,
} from './ExpenseReportMapper';
import { expenseReports } from './ExpenseReportSchema';
import { expenseItems } from './ExpenseItemSchema';

/**
 * Implementation: IExpenseReportRepository using Drizzle ORM
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos filtram por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete com deletedAt (filtrar IS NULL)
 * - UPDATE atualiza TODOS os campos mutáveis (INFRA-005)
 */
@injectable()
export class DrizzleExpenseReportRepository implements IExpenseReportRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport | null, string>> {
    try {
      const reportRows = await db
        .select()
        .from(expenseReports)
        .where(
          and(
            eq(expenseReports.id, id),
            eq(expenseReports.organizationId, organizationId),
            eq(expenseReports.branchId, branchId),
            isNull(expenseReports.deletedAt)
          )
        );
      
      const reportRow = reportRows.slice(0, 1);

      if (!reportRow || reportRow.length === 0) {
        return Result.ok(null);
      }

      // Carregar items
      const itemRows = await db
        .select()
        .from(expenseItems)
        .where(eq(expenseItems.expenseReportId, id));

      const items = [];
      for (const itemRow of itemRows) {
        const itemResult = ExpenseReportMapper.itemToDomain(itemRow as ExpenseItemPersistence);
        if (Result.isFail(itemResult)) {
          return Result.fail(itemResult.error);
        }
        items.push(itemResult.value);
      }

      return ExpenseReportMapper.toDomain(reportRow[0] as ExpenseReportPersistence, items);
    } catch (error) {
      return Result.fail(`Failed to find expense report: ${(error as Error).message}`);
    }
  }

  async findMany(filters: FindExpenseReportsFilters): Promise<Result<ExpenseReport[], string>> {
    try {
      const conditions = [
        eq(expenseReports.organizationId, filters.organizationId),
        eq(expenseReports.branchId, filters.branchId),
        isNull(expenseReports.deletedAt),
      ];

      if (filters.status) {
        conditions.push(eq(expenseReports.status, filters.status));
      }

      if (filters.employeeId) {
        conditions.push(eq(expenseReports.employeeId, filters.employeeId));
      }

      if (filters.costCenterId) {
        conditions.push(eq(expenseReports.costCenterId, filters.costCenterId));
      }

      if (filters.periodoInicio) {
        conditions.push(gte(expenseReports.periodoInicio, filters.periodoInicio));
      }

      if (filters.periodoFim) {
        conditions.push(lte(expenseReports.periodoFim, filters.periodoFim));
      }

      // Query base
      const baseQuery = db
        .select()
        .from(expenseReports)
        .where(and(...conditions))
        .orderBy(desc(expenseReports.createdAt));

      // Aplicar limit e offset usando .offset().fetch() (padrão Drizzle MSSQL)
      let reportRows: typeof expenseReports.$inferSelect[];
      if (filters.limit !== undefined && filters.offset !== undefined) {
        reportRows = await baseQuery.offset(filters.offset).fetch(filters.limit);
      } else if (filters.limit !== undefined) {
        reportRows = await baseQuery.offset(0).fetch(filters.limit);
      } else {
        reportRows = await baseQuery;
      }

      // Carregar items para cada report
      const reports: ExpenseReport[] = [];

      for (const reportRow of reportRows) {
        const itemRows = await db
          .select()
          .from(expenseItems)
          .where(eq(expenseItems.expenseReportId, reportRow.id));

        const items = [];
        for (const itemRow of itemRows) {
          const itemResult = ExpenseReportMapper.itemToDomain(itemRow as ExpenseItemPersistence);
          if (Result.isFail(itemResult)) {
            return Result.fail(itemResult.error);
          }
          items.push(itemResult.value);
        }

        const reportResult = ExpenseReportMapper.toDomain(
          reportRow as ExpenseReportPersistence,
          items
        );

        if (Result.isFail(reportResult)) {
          return Result.fail(reportResult.error);
        }

        reports.push(reportResult.value);
      }

      return Result.ok(reports);
    } catch (error) {
      return Result.fail(`Failed to find expense reports: ${(error as Error).message}`);
    }
  }

  async findByEmployee(
    employeeId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport[], string>> {
    return this.findMany({
      organizationId,
      branchId,
      employeeId,
    });
  }

  async findPendingApproval(
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport[], string>> {
    return this.findMany({
      organizationId,
      branchId,
      status: 'SUBMITTED',
    });
  }

  async save(report: ExpenseReport): Promise<Result<ExpenseReport, string>> {
    try {
      const persistence = ExpenseReportMapper.toPersistence(report);

      // Verificar se já existe
      const existingRows = await db
        .select()
        .from(expenseReports)
        .where(
          and(
            eq(expenseReports.id, report.id),
            eq(expenseReports.organizationId, report.organizationId),
            eq(expenseReports.branchId, report.branchId),
            isNull(expenseReports.deletedAt)
          )
        );
      
      const existing = existingRows.slice(0, 1);

      if (existing && existing.length > 0) {
        // UPDATE - atualizar TODOS os campos mutáveis (INFRA-005)
        await db
          .update(expenseReports)
          .set({
            employeeName: persistence.employeeName,
            costCenterId: persistence.costCenterId,
            periodoInicio: persistence.periodoInicio,
            periodoFim: persistence.periodoFim,
            motivo: persistence.motivo,
            projeto: persistence.projeto,
            advanceValorSolicitadoAmount: persistence.advanceValorSolicitadoAmount,
            advanceValorSolicitadoCurrency: persistence.advanceValorSolicitadoCurrency,
            advanceDataSolicitacao: persistence.advanceDataSolicitacao,
            advanceStatusAprovacao: persistence.advanceStatusAprovacao,
            advanceValorAprovadoAmount: persistence.advanceValorAprovadoAmount,
            advanceValorAprovadoCurrency: persistence.advanceValorAprovadoCurrency,
            advanceDataLiberacao: persistence.advanceDataLiberacao,
            advanceAprovadorId: persistence.advanceAprovadorId,
            totalDespesasAmount: persistence.totalDespesasAmount,
            totalDespesasCurrency: persistence.totalDespesasCurrency,
            saldoAmount: persistence.saldoAmount,
            saldoCurrency: persistence.saldoCurrency,
            status: persistence.status,
            submittedAt: persistence.submittedAt,
            reviewerId: persistence.reviewerId,
            reviewedAt: persistence.reviewedAt,
            reviewNotes: persistence.reviewNotes,
            payableId: persistence.payableId,
            updatedAt: persistence.updatedAt,
            updatedBy: persistence.updatedBy,
          })
          .where(
            and(
              eq(expenseReports.id, report.id),
              eq(expenseReports.organizationId, report.organizationId),
              eq(expenseReports.branchId, report.branchId)
            )
          );

        // Deletar items antigos e inserir novos
        await db
          .delete(expenseItems)
          .where(eq(expenseItems.expenseReportId, report.id));
      } else {
        // INSERT - persistir TODOS os campos
        await db.insert(expenseReports).values(persistence);
      }

      // Inserir items
      if (report.items.length > 0) {
        const itemsPersistence = report.items.map((item) =>
          ExpenseReportMapper.itemToPersistence(item)
        );
        await db.insert(expenseItems).values(itemsPersistence);
      }

      return this.findById(report.id, report.organizationId, report.branchId).then((result) => {
        if (Result.isFail(result)) {
          return Result.fail(result.error);
        }
        if (!result.value) {
          return Result.fail('Failed to retrieve saved expense report');
        }
        return Result.ok(result.value);
      });
    } catch (error) {
      return Result.fail(`Failed to save expense report: ${(error as Error).message}`);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(expenseReports)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(expenseReports.id, id),
            eq(expenseReports.organizationId, organizationId),
            eq(expenseReports.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete expense report: ${(error as Error).message}`);
    }
  }

  async count(filters: FindExpenseReportsFilters): Promise<Result<number, string>> {
    try {
      const conditions = [
        eq(expenseReports.organizationId, filters.organizationId),
        eq(expenseReports.branchId, filters.branchId),
        isNull(expenseReports.deletedAt),
      ];

      if (filters.status) {
        conditions.push(eq(expenseReports.status, filters.status));
      }

      if (filters.employeeId) {
        conditions.push(eq(expenseReports.employeeId, filters.employeeId));
      }

      if (filters.costCenterId) {
        conditions.push(eq(expenseReports.costCenterId, filters.costCenterId));
      }

      const result = await db
        .select()
        .from(expenseReports)
        .where(and(...conditions));

      return Result.ok(result.length);
    } catch (error) {
      return Result.fail(`Failed to count expense reports: ${(error as Error).message}`);
    }
  }
}

