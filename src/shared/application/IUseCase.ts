import type { Result } from '@/shared/domain';

/**
 * Use Case Interface
 * 
 * Interface base para todos os Use Cases da aplicação.
 * Use Cases representam operações da aplicação que orquestram
 * lógica de negócio do Domain.
 * 
 * @template TInput - Tipo do input do Use Case
 * @template TOutput - Tipo do output do Use Case
 * @template TError - Tipo do erro (default: string)
 */
export interface IUseCase<TInput, TOutput, TError = string> {
  /**
   * Executa o caso de uso
   * 
   * @param input - Dados de entrada
   * @returns Promise com Result<TOutput, TError>
   */
  execute(input: TInput): Promise<Result<TOutput, TError>>;
}

