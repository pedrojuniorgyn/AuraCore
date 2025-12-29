import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { JournalEntryLine } from '../../domain/entities/JournalEntryLine';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import { JournalEntryNotFoundError } from '../../domain/errors/AccountingErrors';
import { AddLineInput, AddLineInputSchema, AddLineOutput } from '../dtos/AddLineDTO';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Adicionar Linha ao Lançamento
 */
@injectable()
export class AddLineToEntryUseCase 
  implements IUseCaseWithContext<AddLineInput, AddLineOutput> {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: AddLineInput, 
    ctx: ExecutionContext
  ): Promise<Result<AddLineOutput, string>> {
    
    // 1. Validar input
    const validation = AddLineInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Buscar lançamento
    const entry = await this.repository.findById(
      data.journalEntryId, 
      ctx.organizationId
    );
    
    if (!entry) {
      return Result.fail(new JournalEntryNotFoundError(data.journalEntryId).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && entry.branchId !== ctx.branchId) {
      return Result.fail('Access denied: journal entry belongs to another branch');
    }

    // 4. Criar Money
    const moneyResult = Money.create(data.amount, data.currency);
    if (Result.isFail(moneyResult)) {
      return Result.fail(`Invalid amount: ${moneyResult.error}`);
    }

    // 5. Criar linha
    const lineId = crypto.randomUUID();
    const lineResult = JournalEntryLine.create({
      id: lineId,
      journalEntryId: data.journalEntryId,
      accountId: data.accountId,
      accountCode: data.accountCode,
      entryType: data.entryType,
      amount: moneyResult.value,
      description: data.description,
      costCenterId: data.costCenterId,
      businessPartnerId: data.businessPartnerId,
    });

    if (Result.isFail(lineResult)) {
      return Result.fail(`Failed to create line: ${lineResult.error}`);
    }

    // 6. Adicionar ao lançamento (valida se DRAFT)
    const addResult = entry.addLine(lineResult.value);
    if (Result.isFail(addResult)) {
      return Result.fail(addResult.error);
    }

    // 7. Persistir
    try {
      await this.repository.save(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save: ${message}`);
    }

    // 8. Retornar resultado
    return Result.ok({
      lineId,
      journalEntryId: entry.id,
      entryType: data.entryType,
      amount: data.amount,
      totalDebit: entry.totalDebit.amount,
      totalCredit: entry.totalCredit.amount,
      isBalanced: entry.isBalanced,
    });
  }
}

