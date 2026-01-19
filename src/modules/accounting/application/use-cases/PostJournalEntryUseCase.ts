import { injectable, inject } from '@/shared/infrastructure/di/container';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import type { IPostJournalEntry, PostJournalEntryInput, PostJournalEntryOutput } from '../../domain/ports/input';
import { JournalEntryNotFoundError } from '../../domain/errors/AccountingErrors';
import { ExecutionContext } from './BaseUseCase';

const PostJournalEntryInputSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
});

/**
 * Use Case: Postar Lançamento Contábil
 * 
 * Valida partidas dobradas e muda status para POSTED.
 * 
 * @implements IPostJournalEntry - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class PostJournalEntryUseCase implements IPostJournalEntry {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: PostJournalEntryInput, 
    ctx: ExecutionContext
  ): Promise<Result<PostJournalEntryOutput, string>> {
    
    // 1. Validar input
    const validation = PostJournalEntryInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    // 2. Buscar lançamento (branchId obrigatório - ENFORCE-004)
    const entry = await this.repository.findById(
      input.journalEntryId, 
      ctx.organizationId,
      ctx.branchId
    );
    
    if (!entry) {
      return Result.fail(new JournalEntryNotFoundError(input.journalEntryId).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && entry.branchId !== ctx.branchId) {
      return Result.fail('Access denied: journal entry belongs to another branch');
    }

    // 4. Postar (validações de partidas dobradas no domain)
    const postResult = entry.post(ctx.userId);
    if (Result.isFail(postResult)) {
      return Result.fail(postResult.error);
    }

    // 5. Persistir
    try {
      await this.repository.save(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save journal entry: ${message}`);
    }

    // 6. Retornar resultado
    // Após post() bem-sucedido, postedAt e postedBy são garantidos
    // Mas TypeScript exige tratamento explícito
    const postedAt = entry.postedAt;
    const postedBy = entry.postedBy;

    if (!postedAt || !postedBy) {
      // Este caso nunca deveria acontecer após post() bem-sucedido
      return Result.fail('Internal error: posted entry missing postedAt or postedBy');
    }

    return Result.ok({
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      totalDebit: entry.totalDebit.amount,
      totalCredit: entry.totalCredit.amount,
      postedAt: postedAt.toISOString(),
      postedBy: postedBy,
    });
  }
}

