/**
 * Use Case: ActivateStrategyUseCase
 * Ativa uma estratégia (DRAFT/REVIEWING → ACTIVE)
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { 
  IActivateStrategyUseCase, 
  ActivateStrategyInput 
} from '../../domain/ports/input/IActivateStrategyUseCase';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ActivateStrategyUseCase implements IActivateStrategyUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepository: IStrategyRepository
  ) {}

  async execute(
    input: ActivateStrategyInput,
    context: TenantContext
  ): Promise<Result<void, string>> {
    // 1. Buscar estratégia
    const strategy = await this.strategyRepository.findById(
      input.strategyId,
      context.organizationId,
      context.branchId
    );

    if (!strategy) {
      return Result.fail('Estratégia não encontrada');
    }

    // 2. Verificar se já existe outra ativa
    const activeStrategy = await this.strategyRepository.findActive(
      context.organizationId,
      context.branchId
    );

    if (activeStrategy && activeStrategy.id !== strategy.id) {
      return Result.fail('Já existe uma estratégia ativa. Archive-a primeiro.');
    }

    // 3. Ativar
    const activateResult = strategy.activate();
    if (Result.isFail(activateResult)) {
      return Result.fail(activateResult.error);
    }

    // 4. Persistir
    await this.strategyRepository.save(strategy);

    return Result.ok(undefined);
  }
}
