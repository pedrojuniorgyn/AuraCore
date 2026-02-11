/**
 * API: Integration Logs
 *
 * GET /api/strategic/integrations/logs - Get integration logs
 * Retorna lista vazia até implementar persistência de logs de integração
 *
 * @module app/api/strategic/integrations/logs
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { IntegrationLog } from '@/lib/integrations/integration-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// In-memory storage por organização (temporário)
const logsStoreByOrg = new Map<number, IntegrationLog[]>();

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const integrationId = searchParams.get('integrationId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Buscar logs da organização (ou lista vazia)
    let logs = logsStoreByOrg.get(ctx.organizationId) || [];

    if (provider) {
      logs = logs.filter((l) => l.provider === provider);
    }

    if (integrationId) {
      logs = logs.filter((l) => l.integrationId === integrationId);
    }

    logs = logs.slice(0, limit);

    // Retornar lista vazia - UI deve exibir empty state
    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/integrations/logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST - Registrar log de integração (chamado internamente)
export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const body = await request.json();
    const { integrationId, provider, event, status, destination, response, error: errorMsg } = body;

    const log: IntegrationLog = {
      id: `log-${Date.now()}`,
      integrationId,
      provider,
      event,
      status,
      destination,
      response,
      error: errorMsg,
      retryCount: 0,
      createdAt: new Date(),
    };

    // Adicionar ao store
    const logs = logsStoreByOrg.get(ctx.organizationId) || [];
    logs.unshift(log);
    
    // Manter apenas os últimos 1000 logs
    if (logs.length > 1000) {
      logs.length = 1000;
    }
    
    logsStoreByOrg.set(ctx.organizationId, logs);

    return NextResponse.json({ success: true, id: log.id });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/integrations/logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
