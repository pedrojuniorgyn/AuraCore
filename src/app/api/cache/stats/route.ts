/**
 * API Route: /api/cache/stats
 * GET - Retorna estatísticas do cache Redis
 * 
 * Monitoring de performance do cache:
 * - Hit rate (% de cache hits)
 * - Hits e misses
 * - Latência média
 * - Health status
 * - Alertas (quando hit rate < 60%)
 * 
 * Requer autenticação de admin (TODO)
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '@/services/cache.service';
import { redisCache } from '@/lib/cache';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  try {
    // TODO: Adicionar verificação de role admin
    // const session = await getServerSession();
    // if (!session?.user?.role === 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Stats básicas do CacheService
    const basicStats = await CacheService.getStats();

    // Stats avançadas do RedisCache (INFO stats)
    const redisInfo = await redisCache.getStats();

    // Calcular hit rate
    const hits = parseInt(redisInfo?.keyspace_hits || '0');
    const misses = parseInt(redisInfo?.keyspace_misses || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? parseFloat(((hits / total) * 100).toFixed(2)) : 0;

    // Latência média estimada (baseado em benchmarks típicos)
    const avgLatencyMs = {
      hit: 15, // Redis em rede local: ~10-20ms
      miss: 250, // SQL Server: ~200-500ms (dependendo da query)
    };

    // Calcular melhoria de performance
    const improvement = total > 0 
      ? parseFloat(((1 - avgLatencyMs.hit / avgLatencyMs.miss) * 100).toFixed(0))
      : 0;

    // Health status
    const connected = redisCache.isConnected();
    const isHealthy = connected && hitRate >= 60;
    const status = !connected ? 'disconnected' : isHealthy ? 'healthy' : 'degraded';

    // Alert se hit rate baixo
    let alert = null;
    if (!connected) {
      alert = 'Redis disconnected - cache unavailable';
    } else if (hitRate < 60 && total > 100) {
      alert = `Hit rate below 60% (${hitRate}%) - consider increasing TTLs or pre-warming cache`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        hitRate: `${hitRate}%`,
        hits,
        misses,
        total,
        keys: basicStats.keys,
        memory: basicStats.memory,
      },
      performance: {
        avgLatencyMs,
        improvement: `${improvement}%`,
        estimatedSavings: total > 0 ? `${Math.round((avgLatencyMs.miss - avgLatencyMs.hit) * hits / 1000)}s` : '0s',
      },
      health: {
        connected,
        status,
        alert,
      },
      metadata: {
        redisVersion: redisInfo?.redis_version || 'unknown',
        uptime: redisInfo?.uptime_in_seconds || '0',
      },
    });
  } catch (error) {
    logger.error('[Cache Stats] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch cache stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
