/**
 * API Route: /api/agents/voice/chat
 * Chat por voz com agentes usando Google Cloud Speech.
 *
 * Fluxo:
 * 1. Recebe áudio do frontend (FormData)
 * 2. Envia para backend Python (base64)
 * 3. Backend: STT → Agent → TTS
 * 4. Retorna transcrição + resposta + áudio
 *
 * @module app/api/agents/voice/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://localhost:8000';

interface VoiceProcessResponse {
  success: boolean;
  transcribed_text: string;
  transcription_confidence: number;
  agent_response: string;
  agent_used: string | null;
  audio_response: string | null; // base64
  audio_format: string;
  error: string | null;
}

/**
 * POST /api/agents/voice/chat
 *
 * Body: FormData com:
 * - audio: File (áudio gravado, formato webm)
 * - respondWithAudio?: string ("true"/"false")
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const respondWithAudio = formData.get('respondWithAudio') !== 'false';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Áudio é obrigatório' },
        { status: 400 }
      );
    }

    // Validar tamanho (máx 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Áudio muito grande. Máximo: 10MB' },
        { status: 400 }
      );
    }

    // 3. Converter para base64
    const bytes = await audioFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // 4. Validar branch_id
    if (!session.user.defaultBranchId) {
      return NextResponse.json(
        { error: 'Branch não configurado. Configure um branch padrão nas configurações.' },
        { status: 400 }
      );
    }

    // 5. Chamar backend Python
    const response = await fetch(`${AGENTS_API_URL}/api/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: base64,
        encoding: 'WEBM_OPUS',
        context: {
          user_id: session.user.id,
          org_id: session.user.organizationId,
          branch_id: session.user.defaultBranchId,
          session_id: crypto.randomUUID(),
        },
        respond_with_audio: respondWithAudio,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Voice API error:', errorText);
      return NextResponse.json(
        { error: 'Erro ao processar áudio' },
        { status: response.status }
      );
    }

    const data: VoiceProcessResponse = await response.json();

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Voice chat error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
