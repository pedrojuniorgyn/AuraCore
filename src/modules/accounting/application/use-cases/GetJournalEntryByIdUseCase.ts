import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import type { IGetJournalEntryById, GetJournalEntryByIdInput } from '../../domain/ports/input';
import { JournalEntryNotFoundError } from '../../domain/errors/AccountingErrors';
import { JournalEntryResponseDTO, toJournalEntryResponseDTO } from '../dtos/JournalEntryResponseDTO';
import { ExecutionContext } from './BaseUseCase';

const GetJournalEntryByIdInputSchema = z.object({
  id: z.string().uuid('Invalid journal entry ID'),
});

/**
 * Use Case: Buscar Lançamento Contábil por ID
 * 
 * @implements IGetJournalEntryById - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetJournalEntryByIdUseCase implements IGetJournalEntryById {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: GetJournalEntryByIdInput, 
    ctx: ExecutionContext
  ): Promise<Result<JournalEntryResponseDTO, string>> {
    
    // 1. Validar input
    const validation = GetJournalEntryByIdInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    // 2. Buscar
    const entry = await this.repository.findById(input.id, ctx.organizationId);
    
    if (!entry) {
      return Result.fail(new JournalEntryNotFoundError(input.id).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && entry.branchId !== ctx.branchId) {
      return Result.fail('Access denied: journal entry belongs to another branch');
    }

    // 4. Retornar DTO
    return Result.ok(toJournalEntryResponseDTO(entry));
  }
}

