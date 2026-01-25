import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { JournalEntry } from '../../domain/entities/JournalEntry';
import { JournalEntryLine } from '../../domain/entities/JournalEntryLine';
import type { IJournalEntryRepository } from '../../domain/ports/output/IJournalEntryRepository';
import type { ICreateJournalEntry } from '../../domain/ports/input';
import { 
  CreateJournalEntryInput, 
  CreateJournalEntryInputSchema, 
  CreateJournalEntryOutput 
} from '../dtos/CreateJournalEntryDTO';
import { ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Criar Lançamento Contábil
 * 
 * Cria um lançamento em status DRAFT.
 * Linhas podem ser adicionadas na criação ou depois via AddLineToEntryUseCase.
 * 
 * @implements ICreateJournalEntry - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class CreateJournalEntryUseCase implements ICreateJournalEntry {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
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
    const id = this.uuidGenerator.generate();

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
        id: this.uuidGenerator.generate(),
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

    // 7. Obter valores calculados (agora são métodos Result)
    // ✅ S1.3-APP: getTotalDebit() retorna Result<Money, string>
    const totalDebitResult = entry.getTotalDebit();
    if (Result.isFail(totalDebitResult)) {
      return Result.fail(`Erro ao obter total débito: ${totalDebitResult.error}`);
    }
    
    // ✅ S1.3-APP: getTotalCredit() retorna Result<Money, string>
    const totalCreditResult = entry.getTotalCredit();
    if (Result.isFail(totalCreditResult)) {
      return Result.fail(`Erro ao obter total crédito: ${totalCreditResult.error}`);
    }
    
    // ✅ S1.3-APP: getIsBalanced() retorna Result<boolean, string>
    const isBalancedResult = entry.getIsBalanced();
    if (Result.isFail(isBalancedResult)) {
      return Result.fail(`Erro ao verificar balanceamento: ${isBalancedResult.error}`);
    }
    
    // 8. Retornar DTO
    return Result.ok({
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      lineCount: entry.lineCount,
      totalDebit: totalDebitResult.value.amount,
      totalCredit: totalCreditResult.value.amount,
      isBalanced: isBalancedResult.value,
      createdAt: entry.createdAt.toISOString(),
    });
  }
}

