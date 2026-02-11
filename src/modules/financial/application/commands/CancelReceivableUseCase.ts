/**
 * CancelReceivableUseCase - Command para cancelar conta a receber
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICancelReceivable, CancelReceivableInput, CancelReceivableOutput } from '../../domain/ports/input/ICancelReceivable';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';

@injectable()
export class CancelReceivableUseCase implements ICancelReceivable {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository
  ) {}

  async execute(
    input: CancelReceivableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CancelReceivableOutput, string>> {
    // 1. Buscar receivable
    const findResult = await this.receivableRepository.findById(
      input.id,
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

    // 2. Cancelar
    const cancelResult = receivable.cancel(input.reason, context.userId);
    if (Result.isFail(cancelResult)) {
      return Result.fail(cancelResult.error);
    }

    // 3. Persistir
    const saveResult = await this.receivableRepository.save(receivable);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 4. Retornar output
    return Result.ok({
      id: receivable.id,
      status: receivable.status.value,
      cancelledAt: new Date(),
    });
  }
}
