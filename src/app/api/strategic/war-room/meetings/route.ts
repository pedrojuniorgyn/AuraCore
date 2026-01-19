/**
 * API Routes: /api/strategic/war-room/meetings
 * CRUD de reuniões do War Room
 * 
 * @module app/api/strategic/war-room
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { GenerateAgendaUseCase } from '@/modules/strategic/application/queries/GenerateAgendaUseCase';

const createMeetingSchema = z.object({
  meetingType: z.enum(['BOARD', 'DIRECTOR', 'MANAGER', 'TACTICAL', 'EMERGENCY']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  scheduledAt: z.string().transform((s) => new Date(s)),
  expectedDuration: z.number().min(15).max(480).optional().default(60),
  participants: z.array(z.string().uuid()).optional(),
  generateAgenda: z.boolean().optional().default(true),
});

// GET /api/strategic/war-room/meetings
export async function GET(request: NextRequest) {
  try {
    await getTenantContext(); // Validates auth
    const { searchParams } = new URL(request.url);

    const meetingType = searchParams.get('meetingType') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // TODO: Implementar busca via repository
    // Por agora, retornar mock
    return NextResponse.json({
      items: [],
      total: 0,
      filters: { meetingType, status, fromDate, toDate },
      message: 'Implementação pendente - DrizzleWarRoomMeetingRepository',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('GET /api/strategic/war-room/meetings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/strategic/war-room/meetings
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext();

    const body = await request.json();
    const validation = createMeetingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { generateAgenda, meetingType, scheduledAt, ...meetingData } = validation.data;

    // 1. Gerar pauta automática se solicitado
    let agendaItems: unknown[] = [];
    if (generateAgenda && ['BOARD', 'DIRECTOR', 'MANAGER'].includes(meetingType)) {
      const agendaUseCase = container.resolve(GenerateAgendaUseCase);
      const agendaResult = await agendaUseCase.execute(
        {
          meetingType: meetingType as 'BOARD' | 'DIRECTOR' | 'MANAGER',
          meetingDate: scheduledAt,
        },
        context
      );

      if (Result.isOk(agendaResult)) {
        agendaItems = agendaResult.value.items;
      }
    }

    // 2. Criar reunião
    const meetingId = globalThis.crypto.randomUUID();

    // TODO: Persistir via repository
    // Por agora, retornar dados criados
    return NextResponse.json(
      {
        id: meetingId,
        meetingType,
        scheduledAt: scheduledAt.toISOString(),
        ...meetingData,
        agendaItems,
        status: 'SCHEDULED',
        organizationId: context.organizationId,
        branchId: context.branchId,
        createdBy: context.userId,
        message: 'Reunião criada (persistência pendente)',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/war-room/meetings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
