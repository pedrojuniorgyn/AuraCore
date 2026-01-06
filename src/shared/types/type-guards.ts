/**
 * Type Guards centralizados do AuraCore
 * Usar para validar tipos unknown antes de uso
 * 
 * @version 1.0.0
 * @date 06/01/2026
 * @description Implementação das regras TYPE-UNKNOWN-001 a TYPE-UNKNOWN-005
 */

// ============================================
// ERROR TYPE GUARDS
// ============================================

/**
 * Verifica se um valor desconhecido é uma instância de Error
 * @param error - Valor a ser verificado
 * @returns true se for Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extrai mensagem de erro de forma segura
 * Uso obrigatório em catch blocks (TYPE-UNKNOWN-001)
 * @param error - Erro capturado
 * @returns Mensagem de erro formatada
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

// ============================================
// OBJECT TYPE GUARDS
// ============================================

/**
 * Verifica se um valor é um objeto (não array, não null)
 * @param value - Valor a ser verificado
 * @returns true se for objeto
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Verifica se um valor é um array
 * @param value - Valor a ser verificado
 * @returns true se for array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Verifica se um objeto possui uma propriedade específica
 * @param obj - Objeto a ser verificado
 * @param key - Chave a procurar
 * @returns true se a propriedade existe
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

// ============================================
// PRIMITIVE TYPE GUARDS
// ============================================

/**
 * Verifica se um valor é string
 * @param value - Valor a ser verificado
 * @returns true se for string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Verifica se um valor é número válido
 * @param value - Valor a ser verificado
 * @returns true se for número (não NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Verifica se um valor é boolean
 * @param value - Valor a ser verificado
 * @returns true se for boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// ============================================
// API RESPONSE TYPE GUARD (exemplo)
// ============================================

/**
 * Interface padrão para respostas de API
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Verifica se um valor é uma ApiResponse válida
 * Uso: TYPE-UNKNOWN-003 (APIs externas sem contrato)
 * @param value - Valor a ser verificado
 * @param dataValidator - Função para validar o campo data
 * @returns true se for ApiResponse válida
 */
export function isApiResponse<T>(
  value: unknown,
  dataValidator: (data: unknown) => data is T
): value is ApiResponse<T> {
  return (
    isObject(value) &&
    'data' in value &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    dataValidator(value.data)
  );
}

// ============================================
// DOMAIN-SPECIFIC TYPE GUARDS (exemplos)
// ============================================

/**
 * Exemplo: Verifica se é um documento fiscal válido
 * Expandir conforme necessário para cada entidade do domínio
 */
export function isFiscalDocument(data: unknown): data is {
  documentNumber: string;
  documentType: string;
  id: number;
} {
  return (
    isObject(data) &&
    hasProperty(data, 'documentNumber') &&
    hasProperty(data, 'documentType') &&
    hasProperty(data, 'id') &&
    isString(data.documentNumber) &&
    isString(data.documentType) &&
    isNumber(data.id)
  );
}

// ============================================
// JSON PARSING TYPE GUARD
// ============================================

/**
 * Parse JSON de forma segura com validação
 * Uso: TYPE-UNKNOWN-002 (JSON.parse não validado)
 * @param jsonString - String JSON a ser parseada
 * @param validator - Função de validação do tipo esperado
 * @returns Objeto parseado ou null se inválido
 */
export function parseJsonSafe<T>(
  jsonString: string,
  validator: (data: unknown) => data is T
): T | null {
  try {
    const data: unknown = JSON.parse(jsonString);
    return validator(data) ? data : null;
  } catch {
    return null;
  }
}

// ============================================
// FORM DATA TYPE GUARD
// ============================================

/**
 * Verifica se um valor é um objeto de dados de formulário válido
 * Uso: TYPE-UNKNOWN-005 (Dados de formulário dinâmico)
 * @param value - Valor a ser verificado
 * @returns true se for Record<string, unknown> válido
 */
export function isFormData(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  
  // Verificar se todas as chaves são strings
  return Object.keys(value).every(key => typeof key === 'string');
}

/**
 * Extrai um valor tipado de um form data
 * @param formData - Dados do formulário
 * @param key - Chave a extrair
 * @param validator - Validador do tipo esperado
 * @returns Valor tipado ou undefined
 */
export function getFormValue<T>(
  formData: Record<string, unknown>,
  key: string,
  validator: (value: unknown) => value is T
): T | undefined {
  const value = formData[key];
  return validator(value) ? value : undefined;
}

