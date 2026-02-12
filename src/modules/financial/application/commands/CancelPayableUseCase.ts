import { injectable, inject } from '@/shared/infrastructure/di/container';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { PayableNotFoundError } from '../../domain/errors/FinancialErrors';
import { publishViaOutbox } from '@/shared/application/helpers/publishViaOutbox';
import type {
  ICancelPayable,
  CancelPayableInput,
  CancelPayableOutput,
  ExecutionContext,
} from '../../domain/ports/input';

const CancelPayableInputSchema = z.object({
  payableId: z.string().uuid('Invalid payable ID'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

/**
 * Use Case: Cancelar Conta a Pagar
 * 
 * Implementa ICancelPayable (Input Port)
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class CancelPayableUseCase implements ICancelPayable {
  private readonly payableRepository: IPayableRepository;

  constructor(
    @inject(TOKENS.PayableRepository) payableRepository: IPayableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {
    this.payableRepository = payableRepository;
  }

  async execute(
    input: CancelPayableInput, 
    ctx: ExecutionContext
  ): Promise<Result<CancelPayableOutput, string>> {
    
    // 1. Validar input
    const validation = CancelPayableInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Buscar payable (branchId obrigatório - ENFORCE-004)
    const payable = await this.payableRepository.findById(
      data.payableId,
      ctx.organizationId,
      ctx.branchId
    );
    
    if (!payable) {
      return Result.fail(new PayableNotFoundError(data.payableId).message);
    }

    // 3. branchId já filtrado na query (ENFORCE-004)

    // 4. Cancelar (invariantes validadas no domain)
    const cancelResult = payable.cancel(data.reason, ctx.userId);
    if (Result.isFail(cancelResult)) {
      return Result.fail(cancelResult.error);
    }

    // 5. Persistir
    try {
      await this.payableRepository.save(payable);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save payable: ${message}`);
    }

    // 5.1. Persistir domain events no outbox (F1.7)
    await publishViaOutbox(payable, this.eventPublisher);

    // 6. Retornar resultado
    return Result.ok({
      id: payable.id,
      status: payable.status,
      cancelledAt: payable.updatedAt.toISOString(),
      cancelledBy: ctx.userId,
    });
  }
}

