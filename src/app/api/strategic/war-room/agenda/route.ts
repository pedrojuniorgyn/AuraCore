/**
 * API: POST /api/strategic/war-room/agenda
 * Gera pauta automática para reunião
 * 
 * @module app/api/strategic/war-room
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GenerateAgendaUseCase } from '@/modules/strategic/application/queries/GenerateAgendaUseCase';

const generateAgendaSchema = z.object({
  meetingType: z.enum(['BOARD', 'DIRECTOR', 'MANAGER']),
  meetingDate: z.string().transform((s) => new Date(s)),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = generateAgendaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const useCase = container.resolve(GenerateAgendaUseCase);
    const result = await useCase.execute(validation.data, context);

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/war-room/agenda error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
