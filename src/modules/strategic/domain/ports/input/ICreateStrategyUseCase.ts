/**
 * Input Port: ICreateStrategyUseCase
 * Interface para criação de estratégia
 * 
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';

export interface CreateStrategyInput {
  name: string;
  vision?: string;
  mission?: string;
  values?: string[];
  startDate: Date;
  endDate: Date;
}

export interface CreateStrategyOutput {
  id: string;
  name: string;
  status: string;
}

export interface ICreateStrategyUseCase {
  execute(
    input: CreateStrategyInput,
    context: TenantContext
  ): Promise<Result<CreateStrategyOutput, string>>;
}
