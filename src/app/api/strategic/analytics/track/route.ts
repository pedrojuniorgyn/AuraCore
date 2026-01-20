/**
 * API: POST /api/strategic/analytics/track
 * Recebe eventos de tracking do cliente
 *
 * @module app/api/strategic/analytics/track
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { AnalyticsEvent, TrackEventInput } from '@/lib/analytics/analytics-types';

// In-memory store para desenvolvimento
// Em produção, usar TimescaleDB, ClickHouse, ou similar
const eventsStore: AnalyticsEvent[] = [];

export async function POST(request: NextRequest) {
  const session = await auth();

  // Permitir tracking anônimo com userId opcional
  const userId = session?.user?.id;

  try {
    const body: TrackEventInput = await request.json();

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Invalid events payload' }, { status: 400 });
    }

    // Enriquecer eventos com userId
    const enrichedEvents = body.events.map((event) => ({
      ...event,
      userId: event.userId || userId,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    }));

    // Armazenar eventos (em memória para dev)
    eventsStore.push(...enrichedEvents);

    // Limitar tamanho do store em memória
    if (eventsStore.length > 10000) {
      eventsStore.splice(0, eventsStore.length - 10000);
    }

    // TODO: Em produção, enviar para serviço de analytics
    // await sendToAnalyticsService(enrichedEvents);
    // Ou gravar em banco de dados time-series

    return NextResponse.json({
      success: true,
      eventsReceived: enrichedEvents.length,
    });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ error: 'Failed to track events' }, { status: 500 });
  }
}

// Endpoint para ler eventos (apenas para debug)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    events: eventsStore.slice(-100),
    total: eventsStore.length,
  });
}
