import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IExpenseReportRepository } from '../../../domain/ports/output/IExpenseReportRepository';

/**
 * DTO: Rejeitar Relatório de Despesas
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
 * Transição: SUBMITTED | UNDER_REVIEW → REJECTED
 * 
 * Após rejeição, o colaborador pode revisar e resubmeter.
 * Notas são obrigatórias para explicar o motivo da rejeição.
 */
@injectable()
export class RejectExpenseReportUseCase {
  constructor(
    @inject('IExpenseReportRepository')
    private readonly expenseReportRepository: IExpenseReportRepository
  ) {}

  async execute(dto: RejectExpenseReportDTO): Promise<Result<void, string>> {
    try {
      // Validar notas
      if (!dto.notes || dto.notes.trim().length < 10) {
        return Result.fail('Review notes must have at least 10 characters');
      }

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

      // Rejeitar
      const rejectResult = report.reject(dto.reviewerId, dto.notes);
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

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to reject expense report: ${(error as Error).message}`);
    }
  }
}

