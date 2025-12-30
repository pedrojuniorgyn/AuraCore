import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';

/**
 * DTO: Submeter Relatório de Despesas
 */
export interface SubmitExpenseReportDTO {
  reportId: string;
  organizationId: number;
  branchId: number;
}

/**
 * Use Case: Submeter Relatório de Despesas para Aprovação
 * 
 * Transição: DRAFT → SUBMITTED
 * 
 * Valida que o relatório tem itens antes de submeter.
 */
@injectable()
export class SubmitExpenseReportUseCase {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(dto: SubmitExpenseReportDTO): Promise<Result<void, string>> {
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

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to submit expense report: ${(error as Error).message}`);
    }
  }
}

