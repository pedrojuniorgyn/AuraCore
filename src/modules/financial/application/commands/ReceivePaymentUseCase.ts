/**
 * ReceivePaymentUseCase - Command para registrar recebimento
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IReceivePayment, ReceivePaymentInput, ReceivePaymentOutput } from '../../domain/ports/input/IReceivePayment';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';

@injectable()
export class ReceivePaymentUseCase implements IReceivePayment {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository
  ) {}

  async execute(
    input: ReceivePaymentInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReceivePaymentOutput, string>> {
    // 1. Buscar receivable
    const findResult = await this.receivableRepository.findById(
      input.receivableId,
      context.organizationId,
      context.branchId
    );

    if (Result.isFail(findResult)) {
      return Result.fail(`Erro ao buscar conta a receber: ${findResult.error}`);
    }

    if (!findResult.value) {
      return Result.fail('Conta a receber não encontrada');
    }

    const receivable = findResult.value;

    // 2. Registrar recebimento
    const receiveResult = receivable.receivePayment(
      input.amount,
      input.bankAccountId,
      context.userId
    );

    if (Result.isFail(receiveResult)) {
      return Result.fail(receiveResult.error);
    }

    // 3. Persistir
    const saveResult = await this.receivableRepository.save(receivable);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 4. Retornar output
    return Result.ok({
      id: receivable.id,
      amountReceived: receivable.amountReceived.amount,
      remainingAmount: receivable.remainingAmount.amount,
      status: receivable.status.value,
      receiveDate: receivable.receiveDate,
    });
  }
}
