import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';
import type {
  IRejectExpenseReport,
  RejectExpenseReportInput,
  RejectExpenseReportOutput,
  ExecutionContext,
} from '../../../domain/ports/input';

/**
 * DTO: Rejeitar Relatório de Despesas (deprecated)
 * @deprecated Use RejectExpenseReportInput from domain/ports/input
 */
export interface RejectExpenseReportDTO {
  reportId: string;
  organizationId: number;
  branchId: number;
  reviewerId: string;
  notes: string;
}

/**
 * Use Case: Rejeitar Relatório de Despesas
 * 
 * Implementa IRejectExpenseReport (Input Port)
 * 
 * Transição: SUBMITTED | UNDER_REVIEW → REJECTED
 * 
 * Após rejeição, o colaborador pode revisar e resubmeter.
 * Notas são obrigatórias para explicar o motivo da rejeição.
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class RejectExpenseReportUseCase implements IRejectExpenseReport {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(
    input: RejectExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<RejectExpenseReportOutput, string>> {
    try {
      // Validar motivo
      if (!input.reason || input.reason.trim().length < 10) {
        return Result.fail('Rejection reason must have at least 10 characters');
      }

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

      // Rejeitar
      const rejectResult = report.reject(ctx.userId, input.reason);
      if (Result.isFail(rejectResult)) {
        return Result.fail(rejectResult.error);
      }

      // Salvar
      const saveResult = await this.expenseReportRepository.save(report);
      if (Result.isFail(saveResult)) {
        return Result.fail(saveResult.error);
      }

      // TODO: Notificar colaborador sobre rejeição
      // ExpenseReportRejectedEvent → SendNotificationHandler

      return Result.ok({
        reportId: report.id,
        status: report.status,
        rejectedAt: report.updatedAt.toISOString(),
        rejectedBy: ctx.userId,
      });
    } catch (error) {
      return Result.fail(`Failed to reject expense report: ${(error as Error).message}`);
    }
  }
}

