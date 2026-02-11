/**
 * GetReceivableByIdUseCase - Query para buscar conta a receber por ID
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IGetReceivableById, GetReceivableByIdInput, ReceivableOutput } from '../../domain/ports/input/IGetReceivableById';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import type { AccountReceivable } from '../../domain/entities/AccountReceivable';

@injectable()
export class GetReceivableByIdUseCase implements IGetReceivableById {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository
  ) {}

  async execute(
    input: GetReceivableByIdInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ReceivableOutput | null, string>> {
    const result = await this.receivableRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    if (!result.value) {
      return Result.ok(null);
    }

    return Result.ok(this.mapToOutput(result.value));
  }

  private mapToOutput(receivable: AccountReceivable): ReceivableOutput {
    return {
      id: receivable.id,
      customerId: receivable.customerId,
      documentNumber: receivable.documentNumber,
      description: receivable.description,
      amount: receivable.amount.amount,
      currency: receivable.amount.currency,
      amountReceived: receivable.amountReceived.amount,
      remainingAmount: receivable.remainingAmount.amount,
      issueDate: receivable.issueDate,
      dueDate: receivable.dueDate,
      receiveDate: receivable.receiveDate,
      status: receivable.status.value,
      origin: receivable.origin,
      categoryId: receivable.categoryId,
      costCenterId: receivable.costCenterId,
      chartAccountId: receivable.chartAccountId,
      notes: receivable.notes,
      isOverdue: receivable.isOverdue,
      createdAt: receivable.createdAt,
      updatedAt: receivable.updatedAt,
    };
  }
}
