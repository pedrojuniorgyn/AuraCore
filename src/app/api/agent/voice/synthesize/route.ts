/**
 * API Route: Síntese de Voz
 * 
 * POST /api/agent/voice/synthesize
 * 
 * Converte texto para áudio usando Google Text-to-Speech.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { VoiceHandler } from '@/agent/voice/VoiceHandler';
import { agentLogger } from '@/agent/observability';
import { Result } from '@/shared/domain';
import { withDI } from '@/shared/infrastructure/di/with-di';

const SynthesizeRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceName: z.string().optional(),
  speakingRate: z.number().min(0.25).max(4.0).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']).optional(),
});

export const POST = withDI(async (request: NextRequest) => {
  const timer = agentLogger.startTimer();

  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    agentLogger.info('voice', 'API.synthesize.start', {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
    });

    // 2. Parse e validação do body
    const body = await request.json();
    const parseResult = SynthesizeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: String(parseResult.error) },
        { status: 400 }
      );
    }

    const { text, voiceName, speakingRate, pitch, language } = parseResult.data;

    // 3. Sintetizar
    const voiceHandler = new VoiceHandler();
    const result = await voiceHandler.synthesize(text, {
      language: language ?? 'pt-BR',
      voice: voiceName ? { name: voiceName, gender: 'FEMALE', type: 'WAVENET' } : undefined,
      speakingRate: speakingRate ?? 1.0,
      pitch: pitch ?? 0,
    });

    if (Result.isFail(result)) {
      agentLogger.error('voice', 'API.synthesize.failed', {
        error: result.error,
        durationMs: timer(),
      });

      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const audioBuffer = result.value;

    agentLogger.info('voice', 'API.synthesize.success', {
      textLength: text.length,
      audioSize: audioBuffer.length,
      durationMs: timer(),
    });

    // 4. Retornar áudio como stream
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.synthesize.error', {
      error: errorMessage,
      durationMs: timer(),
    });

    return NextResponse.json(
      { error: 'Synthesis failed' },
      { status: 500 }
    );
  }
});

/**
 * GET - Documentação do endpoint
 */
export const GET = withDI(async () => {
  return NextResponse.json({
    endpoint: '/api/agent/voice/synthesize',
    method: 'POST',
    description: 'Converte texto para áudio usando Google Text-to-Speech',
    contentType: 'application/json',
    parameters: {
      text: {
        type: 'string',
        required: true,
        maxLength: 5000,
        description: 'Texto a ser convertido para áudio',
      },
      voiceName: {
        type: 'string',
        required: false,
        default: 'pt-BR-Wavenet-A',
        examples: ['pt-BR-Wavenet-A', 'pt-BR-Wavenet-B', 'pt-BR-Neural2-A'],
      },
      speakingRate: {
        type: 'number',
        required: false,
        default: 1.0,
        range: '0.25 - 4.0',
      },
      pitch: {
        type: 'number',
        required: false,
        default: 0,
        range: '-20 - 20',
      },
      language: {
        type: 'string',
        required: false,
        default: 'pt-BR',
        options: ['pt-BR', 'en-US', 'es-ES'],
      },
    },
    response: {
      type: 'audio/mpeg',
      description: 'Áudio MP3 do texto sintetizado',
    },
  });
});
