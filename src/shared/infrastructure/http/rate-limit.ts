/**
 * Rate Limiting Middleware
 * Limita requests por tenant (organizationId) + IP
 *
 * @module shared/infrastructure/http
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;      // Janela de tempo em ms (ex: 15 * 60 * 1000 = 15min)
  maxRequests: number;   // Máximo de requests por janela
  keyPrefix?: string;    // Prefixo para a chave (ex: 'api', 'auth')
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Cache em memória (para produção, usar Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Gera chave única para rate limiting
 * Combina: prefix + organizationId (se autenticado) + IP
 */
function getRateLimitKey(
  request: NextRequest,
  prefix: string,
  organizationId?: number
): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (organizationId) {
    return `${prefix}:org:${organizationId}:${ip}`;
  }
  return `${prefix}:ip:${ip}`;
}

/**
 * Limpa entradas expiradas do store (executar periodicamente)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup a cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Verifica e atualiza rate limit
 * @returns objeto com allowed (boolean) e headers de rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  organizationId?: number
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const key = getRateLimitKey(request, config.keyPrefix || 'api', organizationId);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Se não existe ou expirou, criar nova entrada
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count += 1;

  // Verificar se excedeu
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Cria response de rate limit exceeded
 */
export function rateLimitExceededResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Adiciona headers de rate limit à response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

// Configurações pré-definidas por tipo de endpoint
export const RATE_LIMIT_CONFIGS = {
  // APIs gerais: 100 requests por 15 minutos
  api: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
  },

  // Autenticação: 10 tentativas por 15 minutos (mais restritivo)
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'auth',
  },

  // Exports/Reports: 5 por hora (operações pesadas)
  export: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'export',
  },

  // Strategic Dashboard: 30 por minuto (refresh frequente)
  dashboard: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'dashboard',
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;
