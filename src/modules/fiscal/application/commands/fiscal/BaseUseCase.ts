import { Result } from '@/shared/domain';

/**
 * Contexto de execução para Use Cases
 * Contém informações de autenticação e tenant para multi-tenancy
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin: boolean;
}

/**
 * Interface base para Use Cases
 */
export interface IUseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output, string>>;
}

/**
 * Interface para Use Cases com contexto
 */
export interface IUseCaseWithContext<Input, Output> {
  execute(input: Input, context: ExecutionContext): Promise<Result<Output, string>>;
}

