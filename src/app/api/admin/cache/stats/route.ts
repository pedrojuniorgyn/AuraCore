/**
 * E13 - Cache Statistics API
 *
 * Endpoint para visualizar estatísticas do cache LRU.
 *
 * @module api/admin/cache/stats
 * @since E13 - Performance Optimization (Fase 4)
 *
 * BUG 3 FIX: Implementa autenticação real com API Key
 * - Valida formato Bearer <token>
 * - Usa constant-time comparison (anti timing-attack)
 * - Adiciona audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheManager, type CacheStats } from '@/lib/cache/CacheManager';

export const runtime = 'nodejs';

/**
 * Constant-time string comparison
 * Prevents timing attacks by comparing all bytes
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Even for length mismatch, we do a dummy comparison
    // to maintain constant time behavior
    let result = 0;
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      result |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Valida token interno para acesso sem autenticação (cron, health checks)
 *
 * BUG 3 FIX: Usa constant-time comparison para prevenir timing attacks
 */
function isInternalTokenOk(req: NextRequest): boolean {
  const token = process.env.INTERNAL_DIAGNOSTICS_TOKEN;

  if (!token) {
    // No internal token configured - require API Key
    return false;
  }

  const headerToken =
    req.headers.get('x-internal-token') ||
    req.headers.get('x-diagnostics-token');

  if (!headerToken) {
    return false;
  }

  // BUG 3 FIX: Constant-time comparison
  return constantTimeCompare(token, headerToken);
}

/**
 * BUG 3 FIX: Valida API Key no header Authorization
 *
 * @param req - Request object
 * @returns { valid: boolean, error?: string }
 */
function validateApiKey(req: NextRequest): { valid: boolean; error?: string } {
  const adminApiKey = process.env.ADMIN_API_KEY;

  // Se não há API Key configurada, requer token interno
  if (!adminApiKey) {
    console.warn('[SECURITY] ADMIN_API_KEY not configured, falling back to internal token only');
    return { valid: false, error: 'API Key not configured' };
  }

  const authHeader = req.headers.get('authorization');

  // Verificar existência do header
  if (!authHeader) {
    return { valid: false, error: 'Authorization header required' };
  }

  // Validar formato Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { valid: false, error: 'Invalid authorization format. Expected: Bearer <api-key>' };
  }

  const providedKey = parts[1];
  if (!providedKey) {
    return { valid: false, error: 'API key is empty' };
  }

  // BUG 3 FIX: Constant-time comparison para prevenir timing attacks
  if (!constantTimeCompare(adminApiKey, providedKey)) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

/**
 * Log de segurança para tentativas de acesso
 */
function logSecurityEvent(
  eventType: 'unauthorized' | 'forbidden' | 'success',
  req: NextRequest,
  details?: Record<string, unknown>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent'),
    url: req.url,
    method: req.method,
    ...details,
  };

  if (eventType === 'success') {
    console.log('[AUDIT] Cache stats accessed', logData);
  } else {
    console.warn(`[SECURITY] ${eventType.toUpperCase()} cache stats access attempt`, logData);
  }
}

/**
 * GET /api/admin/cache/stats
 *
 * Retorna estatísticas do cache LRU.
 *
 * Authentication:
 * - Option 1: x-internal-token header (for cron/health checks)
 * - Option 2: Authorization: Bearer <ADMIN_API_KEY>
 *
 * @example Response
 * {
 *   "success": true,
 *   "timestamp": "2026-01-23T10:30:00.000Z",
 *   "stats": {
 *     "size": 150,
 *     "maxEntries": 5000,
 *     "hitRate": 82,
 *     ...
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  // Verificar autenticação: token interno OU API Key
  if (!isInternalTokenOk(req)) {
    const apiKeyResult = validateApiKey(req);

    if (!apiKeyResult.valid) {
      logSecurityEvent('unauthorized', req, { reason: apiKeyResult.error });

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: apiKeyResult.error,
          hint: 'Use x-internal-token header or Authorization: Bearer <api-key>',
        },
        { status: 401 }
      );
    }
  }

  // Autenticação bem-sucedida
  logSecurityEvent('success', req);

  try {
    const stats: CacheStats = cacheManager.getStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error('[E13] Cache stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cache/stats
 *
 * Invalida entradas de cache por padrão.
 *
 * @example Body
 * {
 *   "pattern": "financial_titles:1:1"
 * }
 */
export async function POST(req: NextRequest) {
  // Verificar autenticação
  if (!isInternalTokenOk(req)) {
    const apiKeyResult = validateApiKey(req);

    if (!apiKeyResult.valid) {
      logSecurityEvent('unauthorized', req, { reason: apiKeyResult.error });
      return NextResponse.json(
        { error: 'Unauthorized', message: apiKeyResult.error },
        { status: 401 }
      );
    }
  }

  logSecurityEvent('success', req);

  try {
    const body = await req.json();
    const { pattern } = body;

    if (!pattern) {
      return NextResponse.json(
        { error: 'Missing required field: pattern' },
        { status: 400 }
      );
    }

    const invalidatedCount = cacheManager.invalidate(pattern);

    console.log('[AUDIT] Cache invalidated', {
      pattern,
      invalidatedCount,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Invalidated ${invalidatedCount} entries`,
      pattern,
      invalidatedCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cache/stats
 *
 * Limpa todo o cache (para testes e manutenção).
 */
export async function DELETE(req: NextRequest) {
  // Verificar autenticação
  if (!isInternalTokenOk(req)) {
    const apiKeyResult = validateApiKey(req);

    if (!apiKeyResult.valid) {
      logSecurityEvent('unauthorized', req, { reason: apiKeyResult.error });
      return NextResponse.json(
        { error: 'Unauthorized', message: apiKeyResult.error },
        { status: 401 }
      );
    }
  }

  logSecurityEvent('success', req);

  const previousStats = cacheManager.getStats();
  cacheManager.clear();

  console.log('[AUDIT] Cache cleared', {
    previousSize: previousStats.size,
    previousMemory: previousStats.memoryEstimate,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: 'All cache cleared',
    previousSize: previousStats.size,
    previousMemory: previousStats.memoryEstimate,
  });
}
