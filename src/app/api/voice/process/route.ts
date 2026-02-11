/**
 * Proxy seguro para processamento de voz em ambiente HTTPS.
 * Endpoint: POST /api/voice/process
 *
 * Requisitos Wave 1:
 * - Assinatura com Request padrão (sem Next types).
 * - safeJson retorna 400 { error: 'Invalid JSON body' }.
 * - Proxy usa URL HTTPS vinda de VOICE_API_URL/AGENTS_API_URL (sem localhost/http).
 * - Falha do upstream devolve 502 sem derrubar a UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { getErrorMessage } from '@/shared/types/type-guards';

import { logger } from '@/shared/infrastructure/logging';
const bodySchema = z.object({
  audio_base64: z.string().min(1, 'audio_base64 is required'),
  encoding: z.string().min(1, 'encoding is required'),
  respond_with_audio: z.boolean().optional(),
  agent: z.string().optional(),
});

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
};

export const POST = withDI(async (request: NextRequest): Promise<NextResponse> => {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const upstreamBase =
      process.env.VOICE_API_URL ?? process.env.AGENTS_API_URL ?? '';

    if (!upstreamBase) {
      return NextResponse.json(
        { error: 'Voice API URL not configured' },
        { status: 502 }
      );
    }

    if (upstreamBase.startsWith('http://')) {
      return NextResponse.json(
        { error: 'Voice API must use HTTPS' },
        { status: 502 }
      );
    }

    const parsedBody = bodySchema.safeParse(await safeJson<unknown>(request));
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.message },
        { status: 400 }
      );
    }

    const body = {
      ...parsedBody.data,
      context: {
        user_id: tenant.userId,
        org_id: tenant.organizationId,
        branch_id: tenant.branchId,
        session_id: crypto.randomUUID(),
      },
    };

    const response = await fetch(`${upstreamBase}/api/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const upstreamError = await response.text();
      logger.error('Voice upstream error:', upstreamError);
      return NextResponse.json(
        { error: 'Voice processing unavailable' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
