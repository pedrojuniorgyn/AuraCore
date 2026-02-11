import { injectable, inject } from '@/shared/infrastructure/di/container';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { 
  IJournalEntryRepository, 
  FindJournalEntriesFilter, 
  PaginationOptions 
} from '../../domain/ports/output/IJournalEntryRepository';
import type { IListJournalEntries, ListJournalEntriesInput } from '../../domain/ports/input';
import { PaginatedJournalEntriesDTO, toJournalEntryResponseDTO } from '../dtos/JournalEntryResponseDTO';
import { ExecutionContext } from '../use-cases/BaseUseCase';

const ListJournalEntriesInputSchema = z.object({
  status: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  periodYear: z.number().int().min(1900).max(2100).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  entryDateFrom: z.string().datetime().optional(),
  entryDateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Use Case: Listar Lançamentos Contábeis
 * 
 * @implements IListJournalEntries - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class ListJournalEntriesUseCase implements IListJournalEntries {
  
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly repository: IJournalEntryRepository
  ) {
    this.repository = repository;
  }

  async execute(
    input: ListJournalEntriesInput, 
    ctx: ExecutionContext
  ): Promise<Result<PaginatedJournalEntriesDTO, string>> {
    
    // 1. Validar input
    const validation = ListJournalEntriesInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Construir filtro (branchId SEMPRE obrigatório - ENFORCE-004)
    const filter: FindJournalEntriesFilter = {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId, // Sempre obrigatório, admin também filtra por branch
      status: data.status,
      source: data.source,
      periodYear: data.periodYear,
      periodMonth: data.periodMonth,
      entryDateFrom: data.entryDateFrom ? new Date(data.entryDateFrom) : undefined,
      entryDateTo: data.entryDateTo ? new Date(data.entryDateTo) : undefined,
      search: data.search,
    };

    // 3. Construir paginação
    const pagination: PaginationOptions = {
      page: data.page,
      pageSize: data.pageSize,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
    };

    // 4. Buscar
    try {
      const result = await this.repository.findMany(filter, pagination);

      // ✅ S1.3-APP: toJournalEntryResponseDTO agora retorna Result, precisa unwrap
      const dtos = [];
      for (const entry of result.data) {
        const dtoResult = toJournalEntryResponseDTO(entry);
        if (Result.isFail(dtoResult)) {
          return Result.fail(`Erro ao mapear entry ${entry.id}: ${dtoResult.error}`);
        }
        dtos.push(dtoResult.value);
      }

      return Result.ok({
        data: dtos,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to list journal entries: ${message}`);
    }
  }
}

