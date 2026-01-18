/**
 * API Route: Transcrição de Áudio
 * 
 * POST /api/agent/voice/transcribe
 * 
 * Transcreve áudio para texto usando Google Speech-to-Text (Chirp 2).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { VoiceHandler } from '@/agent/voice/VoiceHandler';
import { agentLogger } from '@/agent/observability';
import { Result } from '@/shared/domain';

export async function POST(request: NextRequest) {
  const timer = agentLogger.startTimer();

  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    agentLogger.info('voice', 'API.transcribe.start', {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
    });

    // 2. Extrair áudio do FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // 3. Converter para Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 4. Transcrever
    const voiceHandler = new VoiceHandler();
    const result = await voiceHandler.transcribe(audioBuffer, {
      language: (language as 'pt-BR' | 'en-US' | 'es-ES') ?? 'pt-BR',
    });

    if (Result.isFail(result)) {
      agentLogger.error('voice', 'API.transcribe.failed', {
        error: result.error,
        durationMs: timer(),
      });

      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    agentLogger.info('voice', 'API.transcribe.success', {
      transcriptLength: result.value.transcript.length,
      confidence: result.value.confidence,
      durationMs: timer(),
    });

    return NextResponse.json({
      success: true,
      text: result.value.transcript,
      confidence: result.value.confidence,
      words: result.value.words,
      detectedLanguage: result.value.detectedLanguage,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.transcribe.error', {
      error: errorMessage,
      durationMs: timer(),
    });

    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Documentação do endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agent/voice/transcribe',
    method: 'POST',
    description: 'Transcreve áudio para texto usando Google Speech-to-Text',
    contentType: 'multipart/form-data',
    parameters: {
      audio: {
        type: 'file',
        required: true,
        description: 'Arquivo de áudio (WAV, MP3, WEBM, OGG, FLAC)',
      },
      language: {
        type: 'string',
        required: false,
        default: 'pt-BR',
        options: ['pt-BR', 'en-US', 'es-ES'],
      },
    },
    response: {
      success: 'boolean',
      text: 'string - Texto transcrito',
      confidence: 'number - Confiança (0-1)',
      words: 'array - Palavras com timestamps',
      detectedLanguage: 'string - Idioma detectado',
    },
  });
}
