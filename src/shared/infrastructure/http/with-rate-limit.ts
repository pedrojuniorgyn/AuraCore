/**
 * HOC para aplicar rate limiting em route handlers
 *
 * @module shared/infrastructure/http
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
  type RateLimitType
} from './rate-limit';
import { auth } from '@/lib/auth';

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wrapper que adiciona rate limiting a um route handler
 *
 * @example
 * export const GET = withRateLimit('api', async (request) => {
 *   // handler code
 * });
 */
export function withRateLimit(
  type: RateLimitType,
  handler: RouteHandler
): RouteHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const config = RATE_LIMIT_CONFIGS[type];

    // Tentar obter organizationId da sessão
    let organizationId: number | undefined;
    try {
      const session = await auth();
      organizationId = session?.user?.organizationId;
    } catch {
      // Se não conseguir auth, usar apenas IP
    }

    // Verificar rate limit
    const { allowed, remaining, resetAt, retryAfter } = checkRateLimit(
      request,
      config,
      organizationId
    );

    if (!allowed) {
      return rateLimitExceededResponse(retryAfter!);
    }

    // Executar handler
    const response = await handler(request);

    // Adicionar headers de rate limit
    return addRateLimitHeaders(response, remaining, resetAt, config.maxRequests);
  };
}
