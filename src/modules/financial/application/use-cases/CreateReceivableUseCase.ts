/**
 * CreateReceivableUseCase - Command para criar conta a receber
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { ICreateReceivable, CreateReceivableInput, CreateReceivableOutput } from '../../domain/ports/input/ICreateReceivable';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import { AccountReceivable } from '../../domain/entities/AccountReceivable';

@injectable()
export class CreateReceivableUseCase implements ICreateReceivable {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository
  ) {}

  async execute(
    input: CreateReceivableInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreateReceivableOutput, string>> {
    // 1. Verificar duplicidade de documento
    const existingResult = await this.receivableRepository.findByDocumentNumber(
      input.documentNumber,
      context.organizationId
    );
    if (Result.isFail(existingResult)) {
      return Result.fail(`Erro ao verificar duplicidade: ${existingResult.error}`);
    }
    if (existingResult.value) {
      return Result.fail(`Já existe uma conta a receber com o documento ${input.documentNumber}`);
    }

    // 2. Criar entity
    const receivableResult = AccountReceivable.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      customerId: input.customerId,
      documentNumber: input.documentNumber,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      issueDate: input.issueDate || new Date(),
      dueDate: input.dueDate,
      discountUntil: input.discountUntil,
      discountAmount: input.discountAmount,
      fineRate: input.fineRate,
      interestRate: input.interestRate,
      origin: input.origin,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId,
      chartAccountId: input.chartAccountId,
      notes: input.notes,
      createdBy: context.userId,
    });

    if (Result.isFail(receivableResult)) {
      return Result.fail(receivableResult.error);
    }

    // 3. Persistir
    const saveResult = await this.receivableRepository.save(receivableResult.value);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    const receivable = receivableResult.value;

    // 4. Retornar output
    return Result.ok({
      id: receivable.id,
      documentNumber: receivable.documentNumber,
      status: receivable.status.value,
      amount: receivable.amount.amount,
      currency: receivable.amount.currency,
      dueDate: receivable.dueDate,
      createdAt: receivable.createdAt,
    });
  }
}
