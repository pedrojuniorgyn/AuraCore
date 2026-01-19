/**
 * ListReceivablesUseCase - Query para listar contas a receber
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IListReceivables, ListReceivablesInput, ListReceivablesOutput } from '../../domain/ports/input/IListReceivables';
import type { ReceivableOutput } from '../../domain/ports/input/IGetReceivableById';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import type { AccountReceivable } from '../../domain/entities/AccountReceivable';

@injectable()
export class ListReceivablesUseCase implements IListReceivables {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository
  ) {}

  async execute(
    input: ListReceivablesInput,
    context: { organizationId: number; branchId: number }
  ): Promise<Result<ListReceivablesOutput, string>> {
    // 1. Buscar lista paginada
    const listResult = await this.receivableRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      status: input.status,
      customerId: input.customerId,
      dueDateFrom: input.dueDateFrom,
      dueDateTo: input.dueDateTo,
      overdueOnly: input.overdueOnly,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });

    if (Result.isFail(listResult)) {
      return Result.fail(listResult.error);
    }

    // 2. Buscar summary
    const summaryResult = await this.receivableRepository.getSummary(
      context.organizationId,
      context.branchId
    );

    const summary = Result.isOk(summaryResult) 
      ? summaryResult.value 
      : { totalAmount: 0, totalReceived: 0, totalPending: 0, overdueCount: 0 };

    // 3. Mapear para output
    return Result.ok({
      items: listResult.value.items.map(r => this.mapToOutput(r)),
      total: listResult.value.total,
      page: listResult.value.page,
      pageSize: listResult.value.pageSize,
      summary,
    });
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
