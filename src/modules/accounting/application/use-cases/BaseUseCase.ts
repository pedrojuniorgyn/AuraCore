import { Result } from '@/shared/domain';

/**
 * Interface base para Use Cases
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, string>>;
}

/**
 * Contexto de execução (multi-tenancy + user)
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin: boolean;
}

/**
 * Interface para Use Cases que precisam de contexto
 */
export interface IUseCaseWithContext<TInput, TOutput> {
  execute(input: TInput, ctx: ExecutionContext): Promise<Result<TOutput, string>>;
}

