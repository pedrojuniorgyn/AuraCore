/**
 * SplitPayableUseCase - Command DDD (F2.1)
 * 
 * Divide um título em múltiplas parcelas.
 * Cancela o payable original e cria novos payables para cada parcela.
 */
import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { AccountPayable } from '../../domain/entities/AccountPayable';
import { PaymentTerms } from '../../domain/value-objects/PaymentTerms';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import type { ISplitPayable, SplitPayableInput, SplitPayableOutput } from '../../domain/ports/input/ISplitPayable';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class SplitPayableUseCase implements ISplitPayable {
  constructor(
    @inject(TOKENS.PayableRepository) private readonly repo: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: SplitPayableInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<SplitPayableOutput, string>> {
    // 1. Buscar payable original
    const original = await this.repo.findById(input.payableId, ctx.organizationId, ctx.branchId);
    if (!original) {
      return Result.fail('Payable not found');
    }

    // 2. Validar que pode ser dividido
    const canSplitResult = original.canSplit();
    if (Result.isFail(canSplitResult)) {
      return Result.fail(canSplitResult.error);
    }

    // 3. Validar parcelas
    if (!input.installments || input.installments.length < 2) {
      return Result.fail('At least 2 installments are required for splitting');
    }

    // 4. Validar que soma das parcelas = valor original (tolerância R$ 0.01)
    const totalSplit = input.installments.reduce((sum, i) => sum + i.amount, 0);
    const originalAmount = original.originalAmount.amount;
    const difference = Math.abs(totalSplit - originalAmount);

    if (difference > 0.01) {
      return Result.fail(
        `Soma das parcelas (R$ ${totalSplit.toFixed(2)}) difere do valor original ` +
        `(R$ ${originalAmount.toFixed(2)}). Diferença: R$ ${difference.toFixed(2)}`
      );
    }

    // 5. Criar novos payables
    const newPayables: AccountPayable[] = [];
    const currency = original.originalAmount.currency;

    for (let i = 0; i < input.installments.length; i++) {
      const inst = input.installments[i];
      const installmentNumber = String(i + 1).padStart(3, '0');
      const totalInstallments = String(input.installments.length).padStart(3, '0');

      const amountResult = Money.create(inst.amount, currency);
      if (Result.isFail(amountResult)) {
        return Result.fail(`Invalid amount in installment ${i + 1}: ${amountResult.error}`);
      }

      const termsResult = PaymentTerms.create({
        dueDate: new Date(inst.dueDate),
        amount: amountResult.value,
      });

      if (Result.isFail(termsResult)) {
        return Result.fail(`Invalid terms in installment ${i + 1}: ${termsResult.error}`);
      }

      const payableResult = AccountPayable.create({
        id: this.uuidGenerator.generate(),
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        supplierId: original.supplierId,
        documentNumber: `${original.documentNumber}/${installmentNumber}`,
        description: `${original.description} (Parcela ${installmentNumber}/${totalInstallments})`,
        terms: termsResult.value,
        categoryId: original.categoryId,
        costCenterId: original.costCenterId,
        notes: `Originado do split de ${original.id}`,
      });

      if (Result.isFail(payableResult)) {
        return Result.fail(`Error creating installment ${i + 1}: ${payableResult.error}`);
      }

      newPayables.push(payableResult.value);
    }

    // 6. Cancelar original
    const cancelResult = original.cancel(`Split into ${input.installments.length} installments`, ctx.userId);
    if (Result.isFail(cancelResult)) {
      return Result.fail(`Cannot cancel original for split: ${cancelResult.error}`);
    }

    // 7. Salvar tudo
    await this.repo.save(original);
    for (const p of newPayables) {
      await this.repo.save(p);
    }

    // 8. Publicar eventos via outbox
    const allEvents = [
      ...original.clearDomainEvents(),
      ...newPayables.flatMap(p => p.clearDomainEvents()),
    ];

    if (allEvents.length > 0) {
      try {
        await saveToOutbox(allEvents, db);
      } catch (outboxError: unknown) {
        logger.warn('Outbox save failed for split payable, falling back to direct publish');
        for (const evt of allEvents) {
          await this.eventPublisher.publish(evt);
        }
      }
    }

    logger.info(
      `[SplitPayable] Payable ${original.id} split into ${newPayables.length} installments ` +
      `(total: R$ ${totalSplit.toFixed(2)})`
    );

    return Result.ok({
      cancelledPayableId: original.id,
      newPayableIds: newPayables.map(p => p.id),
      installmentCount: newPayables.length,
      totalAmount: totalSplit,
    });
  }
}
