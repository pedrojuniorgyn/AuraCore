// src/lib/utils/type-guards.ts
/**
 * Type Guards utilitários para validação segura de tipos em runtime.
 * 
 * @module lib/utils/type-guards
 * @see docs/architecture/contracts/TYPE_GUARD_PATTERNS_CONTRACT.md
 */

/**
 * Verifica se valor é string não-vazia
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Extrai string de forma segura, retornando null se inválido
 */
export function safeString(value: unknown): string | null {
  return isNonEmptyString(value) ? value : null;
}

/**
 * Extrai string de forma segura, retornando default se inválido
 */
export function safeStringOrDefault(value: unknown, defaultValue: string): string {
  return isNonEmptyString(value) ? value : defaultValue;
}

/**
 * Verifica se valor é número válido (não NaN)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Extrai número de forma segura
 */
export function safeNumber(value: unknown): number | null {
  return isValidNumber(value) ? value : null;
}

/**
 * Extrai número de forma segura com default
 */
export function safeNumberOrDefault(value: unknown, defaultValue: number): number {
  return isValidNumber(value) ? value : defaultValue;
}

/**
 * Verifica se valor é boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Extrai boolean de forma segura
 */
export function safeBoolean(value: unknown): boolean | null {
  return isBoolean(value) ? value : null;
}

/**
 * Verifica se valor é objeto (não null, não array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extrai objeto de forma segura
 */
export function safeObject(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? value : null;
}

/**
 * Verifica se valor é array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Extrai array de forma segura com type guard para items
 */
export function safeArray<T>(
  value: unknown, 
  itemGuard: (item: unknown) => item is T
): T[] {
  if (!isArray(value)) return [];
  return value.filter(itemGuard);
}

/**
 * Extrai array de strings de forma segura
 */
export function safeStringArray(value: unknown): string[] {
  if (!isArray(value)) return [];
  return value.filter(isNonEmptyString);
}

/**
 * Extrai array de números de forma segura
 */
export function safeNumberArray(value: unknown): number[] {
  if (!isArray(value)) return [];
  return value.filter(isValidNumber);
}
