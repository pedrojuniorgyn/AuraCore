# ADR-0023: Implementação Real-time do War Room

## Status

Proposto

## Data

2026-01-18

## Contexto

O War Room é a sala de controle executivo do módulo Strategic. Precisa de atualizações em tempo real para:

1. **KPIs críticos** - Valores atualizados automaticamente
2. **Alertas de desvio** - Notificações imediatas
3. **Participantes online** - Presença em reuniões
4. **Decisões durante reunião** - Registro colaborativo

A experiência deve ser similar a uma sala de controle real, onde painéis atualizam sem refresh manual.

## Decisão

### Tecnologia: Server-Sent Events (SSE)

Escolhido SSE sobre WebSocket por:

| Critério | SSE | WebSocket |
|----------|-----|-----------|
| Direção | Unidirecional (server → client) ✅ | Bidirecional |
| Complexidade | Baixa ✅ | Média |
| Reconexão | Automática nativa ✅ | Manual |
| Infraestrutura | HTTP padrão ✅ | Protocolo dedicado |
| Compatibilidade Next.js | API Routes nativas ✅ | Requer biblioteca |
| Escalabilidade | Boa (até ~100 conexões) ✅ | Excelente |

Para o War Room, a comunicação é primariamente **server → client** (o servidor envia atualizações de KPIs, alertas, etc.). Ações do usuário (registrar decisão, etc.) usam HTTP POST normal.

### Endpoint SSE

```typescript
// app/api/strategic/war-room/stream/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('meetingId');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Função para enviar evento
      const sendEvent = (type: string, data: unknown) => {
        const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      };
      
      // Enviar estado inicial
      const initialState = await getWarRoomState(session.user.organizationId);
      sendEvent('INITIAL_STATE', initialState);
      
      // Loop de atualização (a cada 30s)
      const intervalId = setInterval(async () => {
        try {
          const kpis = await getUpdatedKPIs(session.user.organizationId);
          sendEvent('KPI_UPDATE', kpis);
          
          const alerts = await getNewAlerts(session.user.organizationId);
          if (alerts.length > 0) {
            sendEvent('ALERTS', alerts);
          }
        } catch (error) {
          sendEvent('ERROR', { message: 'Failed to fetch updates' });
        }
      }, 30000);
      
      // Cleanup quando conexão fecha
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desabilita buffering no nginx
    }
  });
}
```

### Tipos de Eventos

| Evento | Payload | Frequência | Descrição |
|--------|---------|------------|-----------|
| `INITIAL_STATE` | `WarRoomState` | Conexão | Estado completo inicial |
| `KPI_UPDATE` | `{ kpiId, value, status, trend }` | 30s | Atualização de KPI |
| `ALERT` | `{ type, severity, message, entityId }` | Imediato | Novo alerta |
| `PARTICIPANT_JOIN` | `{ userId, name, role }` | Imediato | Participante entrou |
| `PARTICIPANT_LEAVE` | `{ userId }` | Imediato | Participante saiu |
| `DECISION_RECORDED` | `{ decisionId, text, recordedBy }` | Imediato | Decisão registrada |
| `AGENDA_ADVANCE` | `{ itemIndex, currentItem }` | Manual | Avançou na pauta |
| `MEETING_START` | `{ meetingId, startedAt }` | Manual | Reunião iniciada |
| `MEETING_END` | `{ meetingId, endedAt }` | Manual | Reunião encerrada |

### Cliente SSE

```typescript
// hooks/useWarRoomStream.ts
import { useEffect, useState, useCallback } from 'react';

interface WarRoomState {
  kpis: KPIData[];
  alerts: Alert[];
  participants: Participant[];
  currentAgendaItem?: AgendaItem;
  recentDecisions: Decision[];
}

export function useWarRoomStream(meetingId?: string) {
  const [state, setState] = useState<WarRoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const url = new URL('/api/strategic/war-room/stream', window.location.origin);
    if (meetingId) {
      url.searchParams.set('meetingId', meetingId);
    }
    
    const eventSource = new EventSource(url.toString());
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    eventSource.addEventListener('INITIAL_STATE', (event) => {
      const data = JSON.parse(event.data);
      setState(data);
    });
    
    eventSource.addEventListener('KPI_UPDATE', (event) => {
      const updates = JSON.parse(event.data);
      setState(prev => ({
        ...prev!,
        kpis: prev!.kpis.map(kpi => {
          const update = updates.find((u: KPIData) => u.id === kpi.id);
          return update ? { ...kpi, ...update } : kpi;
        })
      }));
    });
    
    eventSource.addEventListener('ALERT', (event) => {
      const alert = JSON.parse(event.data);
      setState(prev => ({
        ...prev!,
        alerts: [alert, ...prev!.alerts].slice(0, 10) // Manter últimos 10
      }));
    });
    
    eventSource.addEventListener('PARTICIPANT_JOIN', (event) => {
      const participant = JSON.parse(event.data);
      setState(prev => ({
        ...prev!,
        participants: [...prev!.participants, participant]
      }));
    });
    
    eventSource.addEventListener('DECISION_RECORDED', (event) => {
      const decision = JSON.parse(event.data);
      setState(prev => ({
        ...prev!,
        recentDecisions: [decision, ...prev!.recentDecisions].slice(0, 5)
      }));
    });
    
    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Conexão perdida. Reconectando...');
      // SSE reconecta automaticamente
    };
    
    return () => {
      eventSource.close();
    };
  }, [meetingId]);
  
  return { state, isConnected, error };
}
```

### Broadcast de Eventos

Para eventos que precisam ser enviados imediatamente (decisões, participantes), usar um serviço de pub/sub:

```typescript
// infrastructure/pubsub/WarRoomEventBroadcaster.ts
import { EventEmitter } from 'events';

class WarRoomEventBroadcaster {
  private static instance: WarRoomEventBroadcaster;
  private emitter: EventEmitter;
  
  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Até 100 conexões
  }
  
  static getInstance(): WarRoomEventBroadcaster {
    if (!this.instance) {
      this.instance = new WarRoomEventBroadcaster();
    }
    return this.instance;
  }
  
  broadcast(organizationId: number, event: string, data: unknown): void {
    this.emitter.emit(`org:${organizationId}`, { event, data });
  }
  
  subscribe(
    organizationId: number,
    callback: (event: { event: string; data: unknown }) => void
  ): () => void {
    const channel = `org:${organizationId}`;
    this.emitter.on(channel, callback);
    return () => this.emitter.off(channel, callback);
  }
}
```

### Fallback para Polling

Se SSE não for suportado ou conexão falhar após 3 tentativas:

```typescript
// hooks/useWarRoomPolling.ts
export function useWarRoomPolling(enabled: boolean, interval = 60000) {
  const [state, setState] = useState<WarRoomState | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const fetchState = async () => {
      const response = await fetch('/api/strategic/war-room/state');
      const data = await response.json();
      setState(data);
    };
    
    fetchState();
    const intervalId = setInterval(fetchState, interval);
    
    return () => clearInterval(intervalId);
  }, [enabled, interval]);
  
  return state;
}

// Hook combinado
export function useWarRoom(meetingId?: string) {
  const { state: sseState, isConnected, error } = useWarRoomStream(meetingId);
  const pollingState = useWarRoomPolling(!isConnected, 60000);
  
  return {
    state: sseState ?? pollingState,
    isConnected,
    isPolling: !isConnected && pollingState !== null,
    error
  };
}
```

### Dashboard War Room

```typescript
// app/(protected)/strategic/war-room/dashboard/page.tsx
'use client';

import { useWarRoom } from '@/hooks/useWarRoom';
import { KPICard, AlertList, ParticipantAvatars, SpotlightGauge } from '@/components/strategic';

export default function WarRoomDashboard() {
  const { state, isConnected, isPolling } = useWarRoom();
  
  if (!state) return <LoadingSpinner />;
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">🎖️ WAR ROOM</h1>
          <p className="text-slate-400">Planejamento Estratégico 2026</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-500' : isPolling ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            {isConnected ? '🔴 AO VIVO' : isPolling ? '🔄 Atualizando...' : '⚠️ Offline'}
          </span>
          <ParticipantAvatars participants={state.participants} />
        </div>
      </header>
      
      {/* Spotlight KPIs */}
      <section className="grid grid-cols-4 gap-6 mb-8">
        {state.kpis.slice(0, 4).map(kpi => (
          <KPICard key={kpi.id} kpi={kpi} spotlight />
        ))}
      </section>
      
      {/* Conteúdo principal */}
      <div className="grid grid-cols-3 gap-6">
        {/* Alertas */}
        <section className="col-span-1 bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">⚠️ Alertas</h2>
          <AlertList alerts={state.alerts} />
        </section>
        
        {/* KPIs secundários */}
        <section className="col-span-2 bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">📊 Indicadores</h2>
          <div className="grid grid-cols-3 gap-4">
            {state.kpis.slice(4).map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

## Consequências

### Positivas

1. **Experiência de sala de controle real**
   - Atualizações automáticas
   - Sem refresh manual
   - Alertas imediatos

2. **Baixo custo de infraestrutura**
   - SSE usa HTTP padrão
   - Sem servidor WebSocket dedicado
   - Funciona com Coolify/Vercel

3. **Escalável para 100+ conexões**
   - EventEmitter leve
   - Polling como fallback
   - Stateless no servidor

4. **Reconexão automática**
   - SSE nativo reconecta
   - Sem perda de atualizações
   - UX consistente

### Negativas

1. **Limite de conexões simultâneas**
   - Browsers limitam ~6 conexões por origem
   - Pode conflitar com outras features SSE

2. **Não bidirecional nativo**
   - Ações do usuário precisam de HTTP POST
   - Latência adicional para comandos

3. **Não funciona offline**
   - Depende de conexão ativa
   - Sem modo offline

## Alternativas Consideradas

### 1. WebSocket com Socket.io

**Rejeitado porque:**
- Complexidade adicional
- Requer servidor dedicado
- Overkill para comunicação unidirecional

### 2. Pusher/Ably (serviço terceiro)

**Rejeitado porque:**
- Custo adicional
- Dependência externa
- Latência de rede extra

### 3. Polling simples

**Rejeitado porque:**
- UX inferior
- Overhead de requests
- Atualizações atrasadas

## Referências

- MDN: Server-Sent Events - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Next.js Streaming - https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
- ADR-0020: Módulo Strategic Management
