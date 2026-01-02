/**
 * Helper para parsing e validação de parâmetros de paginação
 * E7.8 WMS Semana 3 - Etapa 2.3
 * 
 * Corrige bug: parseInt retorna NaN para strings inválidas,
 * mas NaN < 1 === false, permitindo valores inválidos.
 * 
 * Solução: Usar Number.isFinite() para rejeitar NaN.
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export type ParsePaginationResult =
  | {
      success: true;
      data: PaginationParams;
    }
  | {
      success: false;
      error: string;
    };

export interface PaginationDefaults {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

/**
 * Parse e valida parâmetros de paginação de URLSearchParams
 * 
 * @param searchParams - URLSearchParams do request
 * @param defaults - Valores padrão e limite máximo
 * @returns ParsePaginationResult com sucesso ou erro
 * 
 * @example
 * const result = parsePaginationParams(searchParams);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const { page, limit } = result.data;
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: PaginationDefaults = {}
): ParsePaginationResult {
  const {
    page: defaultPage = 1,
    limit: defaultLimit = 20,
    maxLimit = 100,
  } = defaults;

  const pageStr = searchParams.get('page');
  const limitStr = searchParams.get('limit');

  // Parse com fallback para default
  const page = pageStr ? parseInt(pageStr, 10) : defaultPage;
  const limit = limitStr ? parseInt(limitStr, 10) : defaultLimit;

  // ✅ Validar com Number.isFinite() para rejeitar NaN
  if (!Number.isFinite(page) || page < 1) {
    return {
      success: false,
      error: `Invalid page parameter: "${pageStr}". Must be a positive integer.`,
    };
  }

  if (!Number.isFinite(limit) || limit < 1) {
    return {
      success: false,
      error: `Invalid limit parameter: "${limitStr}". Must be a positive integer.`,
    };
  }

  if (limit > maxLimit) {
    return {
      success: false,
      error: `Limit exceeds maximum allowed value of ${maxLimit}.`,
    };
  }

  return {
    success: true,
    data: { page, limit },
  };
}

