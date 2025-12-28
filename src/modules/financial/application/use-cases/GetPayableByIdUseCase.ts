import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { PayableNotFoundError } from '../../domain/errors/FinancialErrors';
import { PayableResponseDTO, toPayableResponseDTO } from '../dtos/PayableResponseDTO';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

const GetPayableByIdInputSchema = z.object({
  id: z.string().uuid('Invalid payable ID'),
});

type GetPayableByIdInput = z.infer<typeof GetPayableByIdInputSchema>;

@injectable()
export class GetPayableByIdUseCase implements IUseCaseWithContext<GetPayableByIdInput, PayableResponseDTO> {
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

    // 2. Buscar
    const payable = await this.payableRepository.findById(input.id, ctx.organizationId);
    
    if (!payable) {
      return Result.fail(new PayableNotFoundError(input.id).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && payable.branchId !== ctx.branchId) {
      return Result.fail('Access denied: payable belongs to another branch');
    }

    // 4. Retornar DTO
    return Result.ok(toPayableResponseDTO(payable));
  }
}

