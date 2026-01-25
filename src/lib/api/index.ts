/**
 * API Helpers & Utilities
 * 
 * Este módulo exporta funções utilitárias para trabalhar com APIs:
 * - fetchAPI: Cliente fetch centralizado com credentials e error handling
 * - Parsing de parâmetros (pagination, date, number, boolean)
 * - HTTP status helpers
 * 
 * @module lib/api
 */

// Fetch Client (CRÍTICO - Sprint Blindagem S2)
export { 
  fetchAPI, 
  fetchAPISafe, 
  buildURL,
  APIResponseError,
  type FetchAPIOptions,
  type APIError 
} from './fetch-client';

// Parameter Parsers
export { 
  parsePaginationParams,
  type PaginationParams,
  type ParsePaginationResult,
  type PaginationDefaults 
} from './pagination';

export { 
  parseDateParam,
  parseDateParamStrict,
  validateDateRange,
} from './date-params';

export { 
  parseNumberParam,
  parsePositiveNumberParam,
  parseIntParam,
} from './number-params';

export { 
  parseBooleanParam,
  parseBooleanParams,
} from './boolean-params';

// HTTP Status Helpers
export { 
  getHttpStatusFromError 
} from './error-status';
