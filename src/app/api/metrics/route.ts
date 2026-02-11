/**
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus text exposition format.
 * Intended to be scraped by Prometheus, Grafana Agent, or any compatible
 * monitoring tool.
 *
 * **Security:** This endpoint should be protected in production via network
 * policy or a bearer token. The optional `METRICS_AUTH_TOKEN` environment
 * variable enables simple token-based auth when set.
 *
 * @module app/api/metrics
 * @see OBS-002 - Prometheus Metrics
 * @see PrometheusMetrics
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { PrometheusMetrics } from '@/shared/infrastructure/observability/PrometheusMetrics';
import { constantTimeEqual } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Content-Type for Prometheus text exposition format.
 * @see https://prometheus.io/docs/instrumenting/exposition_formats/
 */
const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

export const GET = withDI(async (req: NextRequest): Promise<Response> => {
  // Optional bearer-token auth to protect metrics in production (LC-PR88-005)
  const expectedToken = process.env.METRICS_AUTH_TOKEN;
  if (expectedToken) {
    const authHeader = req.headers.get('authorization');
    const providedToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    // Constant-time comparison to prevent timing attacks
    if (!providedToken || !constantTimeEqual(providedToken, expectedToken)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }
  }

  const metrics = PrometheusMetrics.getInstance();
  const body = metrics.serialize();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': PROMETHEUS_CONTENT_TYPE,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
});
