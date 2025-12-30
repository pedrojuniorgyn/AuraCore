import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';

/**
 * DTO: Aprovar Relatório de Despesas
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
 * Transição: SUBMITTED | UNDER_REVIEW → APPROVED
 * 
 * Após aprovação, o relatório fica disponível para processamento
 * pelo Financeiro (geração de título no Contas a Pagar).
 */
@injectable()
export class ApproveExpenseReportUseCase {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(dto: ApproveExpenseReportDTO): Promise<Result<void, string>> {
    try {
      // Buscar relatório
      const reportResult = await this.expenseReportRepository.findById(
        dto.reportId,
        dto.organizationId,
        dto.branchId
      );

      if (Result.isFail(reportResult)) {
        return Result.fail(reportResult.error);
      }

      if (!reportResult.value) {
        return Result.fail(`Expense report ${dto.reportId} not found`);
      }

      const report = reportResult.value;

      // Aprovar
      const approveResult = report.approve(dto.reviewerId, dto.notes);
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

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to approve expense report: ${(error as Error).message}`);
    }
  }
}

