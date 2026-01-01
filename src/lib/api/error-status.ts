/**
 * Error Status Helper - E7.8 WMS
 * 
 * Mapeia mensagens de erro para códigos HTTP apropriados
 * 
 * ENFORCE-019: HTTP Status Code Pattern
 */

/**
 * Determina o código de status HTTP apropriado baseado na mensagem de erro
 * 
 * @param error Mensagem de erro do Result.fail()
 * @returns Código de status HTTP apropriado
 * 
 * Regras:
 * - 404: "not found"
 * - 409: "already exists", "already in progress", "Insufficient", "conflict"
 * - 401: "unauthorized", "not authenticated"
 * - 403: "forbidden", "not allowed"
 * - 400: demais erros de validação
 */
export function getHttpStatusFromError(error: string): number {
  const lowerError = error.toLowerCase();

  // 404 Not Found
  if (lowerError.includes('not found')) {
    return 404;
  }

  // 409 Conflict
  if (
    lowerError.includes('already exists') ||
    lowerError.includes('already in progress') ||
    lowerError.includes('insufficient') ||
    lowerError.includes('conflict')
  ) {
    return 409;
  }

  // 401 Unauthorized
  if (
    lowerError.includes('unauthorized') ||
    lowerError.includes('not authenticated')
  ) {
    return 401;
  }

  // 403 Forbidden
  if (
    lowerError.includes('forbidden') ||
    lowerError.includes('not allowed')
  ) {
    return 403;
  }

  // 400 Bad Request (padrão para erros de validação)
  return 400;
}

