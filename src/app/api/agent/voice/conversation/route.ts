/**
 * API Route: Voice Conversation
 * 
 * POST /api/agent/voice/conversation
 * 
 * Processa mensagem de voz completa:
 * 1. Transcreve áudio para texto
 * 2. Processa com o agente
 * 3. Sintetiza resposta para áudio (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { VoiceEnabledAgent } from '@/agent/core/VoiceEnabledAgent';
import { agentLogger } from '@/agent/observability';
import { Result } from '@/shared/domain';
import { withDI } from '@/shared/infrastructure/di/with-di';

/**
 * POST - Processar mensagem de voz completa
 */
export const POST = withDI(async (request: NextRequest) => {
  const timer = agentLogger.startTimer();

  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    agentLogger.info('voice', 'API.conversation.start', {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
    });

    // 2. Extrair dados do FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const autoRespondParam = formData.get('autoRespond');
    const voiceNameParam = formData.get('voiceName');
    const speakingRateParam = formData.get('speakingRate');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // 3. Converter parâmetros
    const autoRespond = autoRespondParam !== 'false';
    const voiceName = voiceNameParam ? String(voiceNameParam) : undefined;
    const speakingRate = speakingRateParam ? parseFloat(String(speakingRateParam)) : undefined;

    // 4. Converter áudio para Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    agentLogger.info('voice', 'API.conversation.audio_received', {
      audioSize: audioBuffer.length,
      autoRespond,
      voiceName,
      speakingRate,
    });

    // 5. Criar agente com voz
    const agent = await VoiceEnabledAgent.createWithVoice({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
    });

    // 6. Processar mensagem de voz
    const result = await agent.processVoiceMessage(audioBuffer, {
      autoRespond,
      voiceName,
      speakingRate,
    });

    if (Result.isFail(result)) {
      agentLogger.error('voice', 'API.conversation.failed', {
        error: result.error,
        durationMs: timer(),
      });

      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const {
      userTranscript,
      agentResponse,
      audioResponse,
      toolsUsed,
      duration,
    } = result.value;

    agentLogger.info('voice', 'API.conversation.success', {
      transcriptLength: userTranscript.length,
      responseLength: agentResponse.length,
      hasAudioResponse: !!audioResponse,
      toolsUsed,
      duration,
      durationMs: timer(),
    });

    // 7. Montar resposta
    const responsePayload: Record<string, unknown> = {
      success: true,
      userTranscript,
      agentResponse,
      toolsUsed,
      duration,
    };

    // Se tem áudio de resposta, retornar como base64
    if (audioResponse) {
      responsePayload.audioResponseBase64 = audioResponse.toString('base64');
      responsePayload.audioFormat = 'audio/mpeg';
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.conversation.error', {
      error: errorMessage,
      durationMs: timer(),
    });

    return NextResponse.json(
      { error: 'Voice processing failed' },
      { status: 500 }
    );
  }
});

/**
 * GET - Documentação do endpoint
 */
export const GET = withDI(async () => {
  return NextResponse.json({
    endpoint: '/api/agent/voice/conversation',
    method: 'POST',
    description: 'Processa mensagem de voz completa (transcrição + agente + síntese)',
    contentType: 'multipart/form-data',
    parameters: {
      audio: {
        type: 'file',
        required: true,
        description: 'Arquivo de áudio da fala do usuário',
        supportedFormats: ['WAV', 'MP3', 'WEBM', 'OGG', 'FLAC'],
      },
      autoRespond: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Se deve sintetizar a resposta do agente em áudio',
      },
      voiceName: {
        type: 'string',
        required: false,
        default: 'pt-BR-Wavenet-A',
        description: 'Nome da voz para síntese',
        examples: ['pt-BR-Wavenet-A', 'pt-BR-Neural2-A', 'pt-BR-Standard-A'],
      },
      speakingRate: {
        type: 'number',
        required: false,
        default: 1.0,
        range: '0.25 - 4.0',
        description: 'Taxa de fala para síntese',
      },
    },
    response: {
      success: 'boolean',
      userTranscript: 'string - Transcrição da fala do usuário',
      agentResponse: 'string - Resposta textual do agente',
      audioResponseBase64: 'string - Áudio da resposta em base64 (se autoRespond=true)',
      audioFormat: 'string - Formato do áudio (audio/mpeg)',
      toolsUsed: 'array - Lista de tools utilizadas pelo agente',
      duration: 'number - Tempo total de processamento em ms',
    },
    example: {
      curl: `curl -X POST \\
  -H "Authorization: Bearer <token>" \\
  -F "audio=@mensagem.wav" \\
  -F "autoRespond=true" \\
  -F "voiceName=pt-BR-Neural2-A" \\
  https://api.auracore.com/api/agent/voice/conversation`,
    },
  });
});
