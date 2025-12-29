import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import { JournalEntryLine } from '../../domain/entities/JournalEntryLine';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import { 
  CreateJournalEntryInput, 
  CreateJournalEntryInputSchema, 
  CreateJournalEntryOutput 
} from '../dtos/CreateJournalEntryDTO';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Criar Lançamento Contábil
 * 
 * Cria um lançamento em status DRAFT.
 * Linhas podem ser adicionadas na criação ou depois via AddLineToEntryUseCase.
 */
@injectable()
export class CreateJournalEntryUseCase 
  implements IUseCaseWithContext<CreateJournalEntryInput, CreateJournalEntryOutput> {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: CreateJournalEntryInput, 
    ctx: ExecutionContext
  ): Promise<Result<CreateJournalEntryOutput, string>> {
    
    // 1. Validar input com Zod
    const validation = CreateJournalEntryInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Gerar número do lançamento
    const entryNumber = await this.repository.nextEntryNumber(
      ctx.organizationId, 
      ctx.branchId
    );

    // 3. Gerar ID
    const id = crypto.randomUUID();

    // 4. Criar JournalEntry
    const entryResult = JournalEntry.create({
      id,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      entryNumber,
      entryDate: new Date(data.entryDate),
      description: data.description,
      source: data.source,
      sourceId: data.sourceId,
      notes: data.notes,
    });

    if (Result.isFail(entryResult)) {
      return Result.fail(`Failed to create journal entry: ${entryResult.error}`);
    }

    const entry = entryResult.value;

    // 5. Adicionar linhas (se fornecidas)
    for (const lineInput of data.lines) {
      const moneyResult = Money.create(lineInput.amount, lineInput.currency);
      if (Result.isFail(moneyResult)) {
        return Result.fail(`Invalid line amount: ${moneyResult.error}`);
      }

      const lineResult = JournalEntryLine.create({
        id: crypto.randomUUID(),
        journalEntryId: id,
        accountId: lineInput.accountId,
        accountCode: lineInput.accountCode,
        entryType: lineInput.entryType,
        amount: moneyResult.value,
        description: lineInput.description,
        costCenterId: lineInput.costCenterId,
        businessPartnerId: lineInput.businessPartnerId,
      });

      if (Result.isFail(lineResult)) {
        return Result.fail(`Failed to create line: ${lineResult.error}`);
      }

      const addResult = entry.addLine(lineResult.value);
      if (Result.isFail(addResult)) {
        return Result.fail(`Failed to add line: ${addResult.error}`);
      }
    }

    // 6. Persistir
    try {
      await this.repository.save(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save journal entry: ${message}`);
    }

    // 7. Retornar DTO
    return Result.ok({
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      lineCount: entry.lineCount,
      totalDebit: entry.totalDebit.amount,
      totalCredit: entry.totalCredit.amount,
      isBalanced: entry.isBalanced,
      createdAt: entry.createdAt.toISOString(),
    });
  }
}

