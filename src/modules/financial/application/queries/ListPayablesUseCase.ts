import { injectable, inject } from '@/shared/infrastructure/di/container';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository, FindPayablesFilter, PaginationOptions } from '../../domain/ports/output/IPayableRepository';
import { PaginatedPayablesDTO, toPayableResponseDTO } from '../dtos/PayableResponseDTO';
import type { IListPayables, ListPayablesInput, ExecutionContext } from '../../domain/ports/input';

const ListPayablesInputSchema = z.object({
  supplierId: z.number().int().positive().optional(),
  status: z.string().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Use Case: Listar Contas a Pagar
 * 
 * Implementa IListPayables (Input Port)
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class ListPayablesUseCase implements IListPayables {
  private readonly payableRepository: IPayableRepository;

  constructor(@inject(TOKENS.PayableRepository) payableRepository: IPayableRepository) {
    this.payableRepository = payableRepository;
  }

  async execute(
    input: ListPayablesInput, 
    ctx: ExecutionContext
  ): Promise<Result<PaginatedPayablesDTO, string>> {
    
    // 1. Validar input
    const validation = ListPayablesInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Construir filtro (branchId SEMPRE obrigatório - ENFORCE-004)
    const filter: FindPayablesFilter = {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId, // Sempre obrigatório, admin também filtra por branch
      supplierId: data.supplierId,
      status: data.status ? [data.status] : undefined, // Converter string para array
      dueDateFrom: data.dueDateFrom ? new Date(data.dueDateFrom) : undefined,
      dueDateTo: data.dueDateTo ? new Date(data.dueDateTo) : undefined,
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
      const result = await this.payableRepository.findMany(filter, pagination);

      // 5. Mapear para DTOs (toPayableResponseDTO agora retorna Result)
      // ✅ S1.3-APP: Unwrap Result para cada DTO
      const dtos = [];
      for (const payable of result.data) {
        const dtoResult = toPayableResponseDTO(payable);
        if (Result.isFail(dtoResult)) {
          return Result.fail(`Erro ao mapear payable ${payable.id}: ${dtoResult.error}`);
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
      return Result.fail(`Failed to list payables: ${message}`);
    }
  }
}

