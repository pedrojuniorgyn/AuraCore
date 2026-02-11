/**
 * Enhanced Health Check Endpoint
 *
 * Verifies connectivity to critical infrastructure components:
 * - **Database (SQL Server)**: Executes `SELECT 1` probe
 * - **Redis**: Pings Redis when REDIS_URL is configured
 * - **SEFAZ**: Tests SEFAZ connectivity when SEFAZ_URL is configured
 *
 * Returns 200 when all critical components are healthy, 503 when degraded.
 * Used by Coolify/Traefik for readiness probes and by monitoring dashboards.
 *
 * @module app/api/health
 * @see OBS-001 - Enhanced Health Check
 * @see src/shared/infrastructure/observability/PrometheusMetrics.ts
 */
import { NextResponse } from 'next/server';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Standard shape returned by each component check */
interface ComponentCheck {
  /** Current status of the component */
  status: 'up' | 'down' | 'not_configured';
  /** Time taken for the check in milliseconds */
  latency_ms: number;
  /** Error message when status is 'down' */
  error?: string;
}

/** Timeout for each individual health check (ms) */
const CHECK_TIMEOUT_MS = 5_000;

/**
 * Wraps a check function with a timeout guard.
 * Resolves to a 'down' status if the check exceeds {@link CHECK_TIMEOUT_MS}.
 */
async function withTimeout(
  checkFn: () => Promise<ComponentCheck>,
  componentName: string,
): Promise<ComponentCheck> {
  const start = performance.now();
  return Promise.race([
    checkFn(),
    new Promise<ComponentCheck>((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'down',
          latency_ms: Math.round(performance.now() - start),
          error: `${componentName} check timed out after ${CHECK_TIMEOUT_MS}ms`,
        });
      }, CHECK_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Checks SQL Server connectivity by executing `SELECT 1`.
 * Uses dynamic import to avoid pulling heavy DB deps into the health
 * endpoint module graph at compile time.
 */
async function checkDatabase(): Promise<ComponentCheck> {
  const start = performance.now();
  try {
    const { ensureConnection } = await import('@/lib/db');
    const pool = await ensureConnection();
    await pool.request().query('SELECT 1 AS health');
    return {
      status: 'up',
      latency_ms: Math.round(performance.now() - start),
    };
  } catch (error: unknown) {
    return {
      status: 'down',
      latency_ms: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Checks Redis connectivity by sending a PING command.
 * Reuses singleton client (LC-PR88-004) instead of creating new connection per probe.
 * Returns `not_configured` when REDIS_URL is absent.
 */
async function checkRedis(): Promise<ComponentCheck> {
  const start = performance.now();
  try {
    const { getRedisHealthClient } = await import('@/lib/redis-health-client');
    const client = await getRedisHealthClient();

    if (!client) {
      return { status: 'not_configured', latency_ms: 0 };
    }

    const pong = await client.ping();
    return {
      status: pong === 'PONG' ? 'up' : 'down',
      latency_ms: Math.round(performance.now() - start),
    };
  } catch (error: unknown) {
    return {
      status: 'down',
      latency_ms: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Checks SEFAZ connectivity by performing an HTTP HEAD/GET to the
 * configured SEFAZ_URL. Returns `not_configured` when the env var is absent.
 */
async function checkSefaz(): Promise<ComponentCheck> {
  const sefazUrl = process.env.SEFAZ_URL;
  if (!sefazUrl) {
    return { status: 'not_configured', latency_ms: 0 };
  }

  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(sefazUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      return {
        status: response.ok || response.status < 500 ? 'up' : 'down',
        latency_ms: Math.round(performance.now() - start),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: unknown) {
    return {
      status: 'down',
      latency_ms: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const GET = withDI(async () => {
  // Fire-and-forget auto-smoke in background (preserve existing behavior)
  try {
    void import('@/lib/ops/auto-smoke')
      .then(({ scheduleAutoSmokeRun }) => {
        try {
          scheduleAutoSmokeRun('healthcheck');
        } catch (e: unknown) {
          logger.error('auto-smoke failed (schedule):', e);
        }
      })
      .catch((e: unknown) => {
        logger.error('auto-smoke failed (import):', e);
      });
  } catch (e: unknown) {
    logger.error('auto-smoke failed (sync):', e);
  }

  // Run all checks in parallel with individual timeouts
  const [database, redis, sefaz] = await Promise.all([
    withTimeout(checkDatabase, 'database'),
    withTimeout(checkRedis, 'redis'),
    withTimeout(checkSefaz, 'sefaz'),
  ]);

  const checks = {
    database,
    redis,
    sefaz,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  };

  // Database must be up. Redis can be not_configured without degradation.
  const isHealthy =
    checks.database.status === 'up' &&
    (checks.redis.status === 'up' || checks.redis.status === 'not_configured');

  return NextResponse.json(
    { status: isHealthy ? 'healthy' : 'degraded', checks },
    { status: isHealthy ? 200 : 503 },
  );
});
