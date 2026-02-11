/**
 * API: GET /api/strategic/war-room/stream
 * Server-Sent Events para atualizações em tempo real
 * 
 * @module app/api/strategic/war-room
 */
import { NextRequest } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withDI(async (request: NextRequest) => {
  // Validar autenticacao e tenant context antes de abrir stream
  await getTenantContext();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Helper para enviar eventos
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Conexão estabelecida
      sendEvent('connected', { timestamp: new Date().toISOString() });

      // Heartbeat a cada 30 segundos
      const interval = setInterval(() => {
        try {
          sendEvent('heartbeat', { timestamp: new Date().toISOString() });
          
          // Eventos futuros podem incluir:
          // sendEvent('kpi_update', { kpiId: '...', value: 95, status: 'GREEN' });
          // sendEvent('alert', { type: 'KPI_CRITICAL', message: '...' });
          // sendEvent('plan_overdue', { planId: '...', code: 'PA-2026-001' });
        } catch (error) {
          logger.error('War room SSE heartbeat error:', error);
          // Para callbacks de streaming, apenas logar o erro
          // O return aqui retornaria do callback, não do handler HTTP
          // Se necessário, limpar recursos:
          // clearInterval(interval);
          // controller.close();
        }
      }, 30000);

      // Cleanup quando conexão é fechada
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
