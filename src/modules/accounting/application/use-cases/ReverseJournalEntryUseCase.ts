/**
 * Reverse Journal Entry Use Case
 *
 * Orquestra a reversão (estorno) de lançamento contábil.
 *
 * @epic E7.23 - Input Ports Accounting Module
 * @implements IReverseJournalEntry - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import type {
  IReverseJournalEntry,
  ReverseJournalEntryInput,
  ReverseJournalEntryOutput,
} from '../../domain/ports/input';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import { JournalEntryNotFoundError } from '../../domain/errors/AccountingErrors';
import { ExecutionContext } from './BaseUseCase';

const ReverseJournalEntryInputSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
  reason: z.string().min(1, 'Reason is required').max(500),
  reversalDate: z.string().datetime().optional(),
});

/**
 * Use Case: Reverter Lançamento Contábil
 *
 * Fluxo:
 * 1. Validar input
 * 2. Buscar lançamento contábil
 * 3. Validar permissão de branch
 * 4. Criar lançamento de estorno (linhas invertidas)
 * 5. Marcar original como estornado
 * 6. Postar lançamento de estorno
 * 7. Persistir alterações
 */
@injectable()
export class ReverseJournalEntryUseCase implements IReverseJournalEntry {
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
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Buscar lançamento (branchId obrigatório - ENFORCE-004)
    const entry = await this.repository.findById(
      data.journalEntryId,
      ctx.organizationId,
      ctx.branchId
    );

    if (!entry) {
      return Result.fail(
        new JournalEntryNotFoundError(data.journalEntryId).message
      );
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && entry.branchId !== ctx.branchId) {
      return Result.fail('Access denied: journal entry belongs to another branch');
    }

    // 4. Gerar dados do estorno
    const reversalEntryNumber = await this.repository.nextEntryNumber(
      ctx.organizationId,
      ctx.branchId
    );

    const reversalId = globalThis.crypto.randomUUID();
    const description = `Estorno: ${data.reason} (Ref: ${entry.entryNumber})`;

    // 5. Criar lançamento de estorno
    const reversalResult = JournalEntry.createReversal(entry, {
      id: reversalId,
      entryNumber: reversalEntryNumber,
      description,
    });

    if (Result.isFail(reversalResult)) {
      return Result.fail(reversalResult.error);
    }

    const reversal = reversalResult.value;

    // 6. Marcar original como estornado
    const markResult = entry.markAsReversed(reversalId);
    if (Result.isFail(markResult)) {
      return Result.fail(markResult.error);
    }

    // 7. Postar lançamento de estorno
    const postResult = reversal.post(ctx.userId);
    if (Result.isFail(postResult)) {
      return Result.fail(`Failed to post reversal: ${postResult.error}`);
    }

    // 8. Persistir ambos (original atualizado + estorno)
    try {
      await this.repository.save(entry);
      await this.repository.save(reversal);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save reversal: ${message}`);
    }

    // 9. Retornar resultado
    return Result.ok({
      originalEntryId: entry.id,
      reversalEntryId: reversalId,
      reversalEntryNumber,
      status: 'REVERSED',
      reversedAt: new Date().toISOString(),
    });
  }
}
