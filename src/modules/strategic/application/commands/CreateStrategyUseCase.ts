/**
 * Use Case: CreateStrategyUseCase
 * Cria uma nova estratégia
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { 
  ICreateStrategyUseCase, 
  CreateStrategyInput, 
  CreateStrategyOutput 
} from '../../domain/ports/input/ICreateStrategyUseCase';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import { Strategy } from '../../domain/entities/Strategy';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class CreateStrategyUseCase implements ICreateStrategyUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepository: IStrategyRepository
  ) {}

  async execute(
    input: CreateStrategyInput,
    context: TenantContext
  ): Promise<Result<CreateStrategyOutput, string>> {
    // 1. Validar context
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Criar entity
    const strategyResult = Strategy.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      name: input.name,
      vision: input.vision,
      mission: input.mission,
      values: input.values,
      startDate: input.startDate,
      endDate: input.endDate,
      createdBy: context.userId,
    });

    if (Result.isFail(strategyResult)) {
      return Result.fail(strategyResult.error);
    }

    const strategy = strategyResult.value;

    // 3. Persistir
    await this.strategyRepository.save(strategy);

    // 4. Retornar output
    return Result.ok({
      id: strategy.id,
      name: strategy.name,
      status: strategy.status,
    });
  }
}
