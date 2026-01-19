/**
 * Input Port: IActivateStrategyUseCase
 * Interface para ativar estratégia
 * 
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';

export interface ActivateStrategyInput {
  strategyId: string;
}

export interface IActivateStrategyUseCase {
  execute(
    input: ActivateStrategyInput,
    context: TenantContext
  ): Promise<Result<void, string>>;
}
