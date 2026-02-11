/**
 * API Route: /api/test-cache
 * GET - Testa conexão Redis e operações de cache
 * 
 * Rota temporária para diagnóstico do Redis em produção
 * Requer autenticacao (admin only)
 */
import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { CacheService, CacheTTL } from '@/services/cache.service';
import { withDI } from '@/shared/infrastructure/di/with-di';

export const GET = withDI(async () => {
  // Requer autenticacao para acesso a diagnostico
  await getTenantContext();
  try {
    const testKey = 'test-cache-diagnostic';
    const testValue = {
      timestamp: new Date().toISOString(),
      message: 'Redis cache test',
      success: true,
    };

    // Teste 1: SET
    await CacheService.set(testKey, testValue, CacheTTL.SHORT);

    // Teste 2: GET
    const cached = await CacheService.get(testKey);

    // Teste 3: Stats
    const stats = await CacheService.getStats();

    return NextResponse.json({
      success: true,
      redis: {
        status: 'connected',
        testSet: 'OK',
        testGet: cached ? 'OK' : 'FAILED',
      },
      cache: {
        retrieved: cached,
        stats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      redis: {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
    });
  }
});
