/**
 * E13 - Cache Statistics API
 *
 * Endpoint para visualizar estatísticas do cache LRU.
 *
 * @module api/admin/cache/stats
 * @since E13 - Performance Optimization (Fase 4)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheManager, type CacheStats } from '@/lib/cache/CacheManager';

export const runtime = 'nodejs';

/**
 * Valida token interno para acesso sem autenticação (cron, health checks)
 */
function isInternalTokenOk(req: NextRequest): boolean {
  const token = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerToken =
    req.headers.get('x-internal-token') ||
    req.headers.get('x-diagnostics-token');

  if (token && headerToken && headerToken === token) return true;
  return false;
}

/**
 * GET /api/admin/cache/stats
 *
 * Retorna estatísticas do cache LRU.
 *
 * @example Response
 * {
 *   "success": true,
 *   "timestamp": "2026-01-23T10:30:00.000Z",
 *   "stats": {
 *     "size": 150,
 *     "maxEntries": 5000,
 *     "hitRate": 82,
 *     "hitRateByResource": {
 *       "branches": 95,
 *       "notifications_count": 75,
 *       "dashboard_metrics": 80
 *     },
 *     "totalHits": 4500,
 *     "totalMisses": 980,
 *     "oldestEntry": "2026-01-23T09:30:00.000Z",
 *     "memoryEstimate": "2.5MB"
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  // Verificar autenticação (token interno ou sessão)
  if (!isInternalTokenOk(req)) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - requires admin access or internal token' },
        { status: 401 }
      );
    }
  }

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
  if (!isInternalTokenOk(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - requires internal token' },
      { status: 401 }
    );
  }

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
  if (!isInternalTokenOk(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - requires internal token' },
      { status: 401 }
    );
  }

  const previousStats = cacheManager.getStats();
  cacheManager.clear();

  return NextResponse.json({
    success: true,
    message: 'All cache cleared',
    previousSize: previousStats.size,
    previousMemory: previousStats.memoryEstimate,
  });
}

/**
 * GET /api/admin/cache/stats/keys
 *
 * Lista chaves de cache (para debug).
 * Query params: pattern (opcional)
 */
// Nota: Para listar chaves, adicionar rota /keys separada se necessário
