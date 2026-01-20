/**
 * API: GET /api/strategic/notifications/stream
 * Server-Sent Events para notificações em tempo real
 *
 * @module app/api/strategic/notifications/stream
 */
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Autenticação
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: userId, organizationId, defaultBranchId } = session.user;
  const branchId = defaultBranchId || 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Helper para enviar eventos SSE
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          console.error('SSE send error:', e);
        }
      };

      // Conexão estabelecida
      sendEvent('connected', {
        userId,
        timestamp: new Date().toISOString(),
      });

      // Heartbeat a cada 30 segundos
      const heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { timestamp: Date.now() });
      }, 30000);

      // Demo: Enviar notificação de boas-vindas após 2 segundos
      const welcomeTimeout = setTimeout(() => {
        sendEvent('notification', {
          type: 'notification',
          notification: {
            id: crypto.randomUUID(),
            type: 'system_announcement',
            priority: 'low',
            title: 'Sistema de Notificações Ativo',
            message: 'Você receberá alertas de KPIs e atualizações em tempo real.',
            createdAt: new Date().toISOString(),
            userId,
            organizationId,
            branchId,
          },
        });
      }, 2000);

      // TODO: Em produção, substituir por Redis Pub/Sub ou similar
      // Exemplo:
      // const subscriber = redis.subscribe(`notifications:${userId}`);
      // subscriber.on('message', (channel, message) => {
      //   sendEvent('notification', JSON.parse(message));
      // });

      // Cleanup quando conexão é fechada
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        clearTimeout(welcomeTimeout);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
