import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { PayableNotFoundError } from '../../domain/errors/FinancialErrors';
import { PayableResponseDTO, toPayableResponseDTO } from '../dtos/PayableResponseDTO';
import type { IGetPayableById, GetPayableByIdInput, ExecutionContext } from '../../domain/ports/input';

const GetPayableByIdInputSchema = z.object({
  payableId: z.string().uuid('Invalid payable ID'),
});

/**
 * Use Case: Buscar Conta a Pagar por ID
 * 
 * Implementa IGetPayableById (Input Port)
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class GetPayableByIdUseCase implements IGetPayableById {
  private readonly payableRepository: IPayableRepository;

  constructor(@inject(TOKENS.PayableRepository) payableRepository: IPayableRepository) {
    this.payableRepository = payableRepository;
  }

  async execute(
    input: GetPayableByIdInput, 
    ctx: ExecutionContext
  ): Promise<Result<PayableResponseDTO, string>> {
    
    // 1. Validar input
    const validation = GetPayableByIdInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    // 2. Buscar (branchId obrigatório - ENFORCE-004)
    const payable = await this.payableRepository.findById(
      input.payableId,
      ctx.organizationId,
      ctx.branchId
    );
    
    if (!payable) {
      return Result.fail(new PayableNotFoundError(input.payableId).message);
    }

    // 3. Retornar DTO (branchId já filtrado na query)
    return Result.ok(toPayableResponseDTO(payable));
  }
}

