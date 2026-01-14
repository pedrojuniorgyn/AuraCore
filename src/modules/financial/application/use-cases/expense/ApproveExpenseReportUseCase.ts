import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';
import type {
  IApproveExpenseReport,
  ApproveExpenseReportInput,
  ApproveExpenseReportOutput,
  ExecutionContext,
} from '../../../domain/ports/input';

/**
 * DTO: Aprovar Relatório de Despesas (deprecated - usar Input Port)
 * @deprecated Use ApproveExpenseReportInput from domain/ports/input
 */
export interface ApproveExpenseReportDTO {
  reportId: string;
  organizationId: number;
  branchId: number;
  reviewerId: string;
  notes?: string;
}

/**
 * Use Case: Aprovar Relatório de Despesas
 * 
 * Implementa IApproveExpenseReport (Input Port)
 * 
 * Transição: SUBMITTED | UNDER_REVIEW → APPROVED
 * 
 * Após aprovação, o relatório fica disponível para processamento
 * pelo Financeiro (geração de título no Contas a Pagar).
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class ApproveExpenseReportUseCase implements IApproveExpenseReport {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(
    input: ApproveExpenseReportInput,
    ctx: ExecutionContext
  ): Promise<Result<ApproveExpenseReportOutput, string>> {
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

      // Aprovar
      const approveResult = report.approve(ctx.userId, input.comments);
      if (Result.isFail(approveResult)) {
        return Result.fail(approveResult.error);
      }

      // Salvar
      const saveResult = await this.expenseReportRepository.save(report);
      if (Result.isFail(saveResult)) {
        return Result.fail(saveResult.error);
      }

      // TODO: Disparar evento para criar título no Contas a Pagar
      // ExpenseReportApprovedEvent → CreatePayableFromExpenseReportHandler

      return Result.ok({
        reportId: report.id,
        status: report.status,
        approvedAt: report.updatedAt.toISOString(),
        approvedBy: ctx.userId,
        payableIds: [], // TODO: Retornar IDs das contas criadas
      });
    } catch (error) {
      return Result.fail(`Failed to approve expense report: ${(error as Error).message}`);
    }
  }
}

