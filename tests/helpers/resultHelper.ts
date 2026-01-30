/**
 * Test Helper: Result Unwrap
 * Utilitários para testes que usam Result<T, E>
 *
 * @module tests/helpers
 */
import { Result } from '@/shared/domain';

/**
 * Unwrap Result ou falha o teste com mensagem clara
 */
export function unwrapOrFail<T, E>(result: Result<T, E>, message?: string): T {
  if (Result.isFail(result)) {
    const errorMsg = message 
      ? `${message}: ${result.error}` 
      : `Expected Ok but got Fail: ${result.error}`;
    throw new Error(errorMsg);
  }
  return result.value;
}

/**
 * Assert que Result é Ok e retorna o valor
 */
export function expectOk<T, E>(result: Result<T, E>): T {
  expect(Result.isOk(result)).toBe(true);
  return (result as { value: T }).value;
}

/**
 * Assert que Result é Fail e retorna o erro
 */
export function expectFail<T, E>(result: Result<T, E>): E {
  expect(Result.isFail(result)).toBe(true);
  return (result as { error: E }).error;
}