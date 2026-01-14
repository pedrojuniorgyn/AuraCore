import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';
import type {
  ISubmitExpenseReport,
  SubmitExpenseReportInput,
  SubmitExpenseReportOutput,
  ExecutionContext,
} from '../../../domain/ports/input';

/**
 * DTO: Submeter Relatório de Despesas (deprecated)
 * @deprecated Use SubmitExpenseReportInput from domain/ports/input
 */
export interface SubmitExpenseReportDTO {
  reportId: string;
  organizationId: number;
  branchId: number;
}

/**
 * Use Case: Submeter Relatório de Despesas para Aprovação
 * 
 * Implementa ISubmitExpenseReport (Input Port)
 * 
 * Transição: DRAFT → SUBMITTED
 * 
 * Valida que o relatório tem itens antes de submeter.
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class SubmitExpenseReportUseCase implements ISubmitExpenseReport {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(
    input: SubmitExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<SubmitExpenseReportOutput, string>> {
    try {
      // Buscar relatório
      const reportResult = await this.expenseReportRepository.findById(
        input.reportId,
        ctx.organizationId,
        ctx.branchId
      );

      if (Result.isFail(reportResult)) {
        return Result.fail(reportResult.error);
      }

      if (!reportResult.value) {
        return Result.fail(`Expense report ${input.reportId} not found`);
      }

      const report = reportResult.value;

      // Submeter
      const submitResult = report.submit();
      if (Result.isFail(submitResult)) {
        return Result.fail(submitResult.error);
      }

      // Salvar
      const saveResult = await this.expenseReportRepository.save(report);
      if (Result.isFail(saveResult)) {
        return Result.fail(saveResult.error);
      }

      return Result.ok({
        reportId: report.id,
        status: report.status,
        submittedAt: report.updatedAt.toISOString(),
        totalAmount: 0, // TODO: Adicionar totalAmount ao ExpenseReport
        expensesCount: 0, // TODO: Adicionar expenses ao ExpenseReport
      });
    } catch (error) {
      return Result.fail(`Failed to submit expense report: ${(error as Error).message}`);
    }
  }
}

