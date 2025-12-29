import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import { JournalEntryNotFoundError } from '../../domain/errors/AccountingErrors';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

const ReverseJournalEntryInputSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

type ReverseJournalEntryInput = z.infer<typeof ReverseJournalEntryInputSchema>;

interface ReverseJournalEntryOutput {
  originalId: string;
  originalStatus: string;
  reversalId: string;
  reversalEntryNumber: string;
  reversalStatus: string;
}

/**
 * Use Case: Estornar Lançamento Contábil
 * 
 * Cria lançamento inverso e marca original como REVERSED.
 */
@injectable()
export class ReverseJournalEntryUseCase 
  implements IUseCaseWithContext<ReverseJournalEntryInput, ReverseJournalEntryOutput> {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: ReverseJournalEntryInput, 
    ctx: ExecutionContext
  ): Promise<Result<ReverseJournalEntryOutput, string>> {
    
    // 1. Validar input
    const validation = ReverseJournalEntryInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    // 2. Buscar lançamento original
    const original = await this.repository.findById(
      input.journalEntryId, 
      ctx.organizationId
    );
    
    if (!original) {
      return Result.fail(new JournalEntryNotFoundError(input.journalEntryId).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && original.branchId !== ctx.branchId) {
      return Result.fail('Access denied: journal entry belongs to another branch');
    }

    // 4. Gerar número para o estorno
    const reversalNumber = await this.repository.nextEntryNumber(
      ctx.organizationId, 
      ctx.branchId
    );

    // 5. Criar lançamento de estorno
    const reversalResult = JournalEntry.createReversal(original, {
      id: crypto.randomUUID(),
      entryNumber: reversalNumber,
      description: `Reversal: ${input.reason}`,
    });

    if (Result.isFail(reversalResult)) {
      return Result.fail(reversalResult.error);
    }

    const reversal = reversalResult.value;

    // 6. Postar o estorno automaticamente
    const postResult = reversal.post(ctx.userId);
    if (Result.isFail(postResult)) {
      return Result.fail(`Failed to post reversal: ${postResult.error}`);
    }

    // 7. Marcar original como estornado
    const markResult = original.markAsReversed(reversal.id);
    if (Result.isFail(markResult)) {
      return Result.fail(markResult.error);
    }

    // 8. Persistir ambos atomicamente
    // saveMany deve ser implementado com transação no repository (Infrastructure Layer)
    try {
      await this.repository.saveMany([reversal, original]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save reversal: ${message}`);
    }

    // 9. Retornar resultado
    return Result.ok({
      originalId: original.id,
      originalStatus: original.status,
      reversalId: reversal.id,
      reversalEntryNumber: reversal.entryNumber,
      reversalStatus: reversal.status,
    });
  }
}

