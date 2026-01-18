/**
 * API Route: Voice Streaming
 * 
 * GET /api/agent/voice/stream - Server-Sent Events para transcrições em tempo real
 * POST /api/agent/voice/stream - Enviar chunks de áudio
 * DELETE /api/agent/voice/stream - Encerrar streaming
 * 
 * Nota: Next.js 15 não tem suporte nativo a WebSocket.
 * Esta implementação usa SSE (Server-Sent Events) como alternativa.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { streamingVoiceHandler } from '@/agent/voice/StreamingVoiceHandler';
import { agentLogger } from '@/agent/observability';
import type { AgentExecutionContext } from '@/agent/core/AgentContext';

/**
 * GET - Server-Sent Events para transcrições em tempo real
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return new Response('Unauthorized', { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // 2. Obter sessionId
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // 3. Verificar se sessão já existe
    if (streamingVoiceHandler.isSessionActive(sessionId)) {
      return new Response(JSON.stringify({ error: 'Session already active' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    agentLogger.info('voice', 'API.stream.start', {
      sessionId,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
    });

    // 4. Criar contexto de execução
    const executionContext: AgentExecutionContext = {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
      sessionId,
    };

    // 5. Configurar SSE
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        streamController = controller;

        try {
          // Iniciar streaming de voz
          await streamingVoiceHandler.startStreaming(
            sessionId,
            executionContext,
            {},
            {
              onTranscript: (transcript, isFinal) => {
                const data = JSON.stringify({ transcript, isFinal, timestamp: new Date().toISOString() });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              onError: (error) => {
                const data = JSON.stringify({ error: error.message, type: 'error' });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                controller.close();
              },
            }
          );

          // Enviar evento de início
          const startData = JSON.stringify({ type: 'connected', sessionId });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const data = JSON.stringify({ error: errorMessage, type: 'init_error' });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      },
      cancel() {
        if (sessionId) {
          streamingVoiceHandler.stopStreaming(sessionId);
          
          agentLogger.info('voice', 'API.stream.cancelled', {
            sessionId,
            userId: ctx.userId,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Desabilitar buffering nginx
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    agentLogger.error('voice', 'API.stream.error', {
      error: errorMessage,
    });

    return new Response(JSON.stringify({ error: 'Stream initialization failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST - Enviar chunks de áudio para o stream
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obter sessionId
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // 3. Verificar se sessão está ativa
    if (!streamingVoiceHandler.isSessionActive(sessionId)) {
      return NextResponse.json({ error: 'Session not found or inactive' }, { status: 404 });
    }

    // 4. Obter dados de áudio
    const audioData = await request.arrayBuffer();
    if (audioData.byteLength === 0) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    // 5. Enviar chunk
    streamingVoiceHandler.sendAudioChunk(sessionId, Buffer.from(audioData));

    return NextResponse.json({
      success: true,
      bytesReceived: audioData.byteLength,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.stream.chunk_error', {
      error: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE - Encerrar streaming e obter transcrição final
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obter sessionId
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // 3. Parar streaming
    const finalTranscript = streamingVoiceHandler.stopStreaming(sessionId);

    agentLogger.info('voice', 'API.stream.stop', {
      sessionId,
      transcriptLength: finalTranscript.length,
      userId: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      finalTranscript,
      sessionId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.stream.stop_error', {
      error: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
