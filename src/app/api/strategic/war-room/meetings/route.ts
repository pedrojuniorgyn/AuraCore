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
import { WarRoomMeeting, type MeetingType, type MeetingStatus } from '@/modules/strategic/domain/entities/WarRoomMeeting';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IWarRoomMeetingRepository } from '@/modules/strategic/domain/ports/output/IWarRoomMeetingRepository';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

const createMeetingSchema = z.object({
  strategyId: z.string().uuid().optional(),
  meetingType: z.enum(['BOARD', 'DIRECTOR', 'MANAGER', 'TACTICAL', 'EMERGENCY']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  scheduledAt: z.string().transform((s) => new Date(s)),
  expectedDuration: z.number().min(15).max(480).optional().default(60),
  participants: z.array(z.string().uuid()).optional(),
  facilitatorUserId: z.string().uuid().optional(),
  generateAgenda: z.boolean().optional().default(true),
});

// GET /api/strategic/war-room/meetings
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const meetingType = (searchParams.get('meetingType') ?? undefined) as MeetingType | undefined;
    const status = (searchParams.get('status') ?? undefined) as MeetingStatus | undefined;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const strategyId = searchParams.get('strategyId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const repository = container.resolve<IWarRoomMeetingRepository>(
      STRATEGIC_TOKENS.WarRoomMeetingRepository
    );

    const { items, total } = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId,
      meetingType,
      status,
      scheduledFrom: fromDate ? new Date(fromDate) : undefined,
      scheduledTo: toDate ? new Date(toDate) : undefined,
      page,
      pageSize,
    });

    // Buscar nomes dos facilitadores
    const facilitatorIds = [...new Set(items.map(m => m.facilitatorUserId).filter(Boolean))];
    const facilitatorNames: Record<string, string> = {};
    
    if (facilitatorIds.length > 0) {
      const facilitators = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, facilitatorIds));
      
      for (const f of facilitators) {
        if (f.name) {
          facilitatorNames[f.id] = f.name;
        }
      }
    }

    return NextResponse.json({
      items: items.map((meeting) => ({
        id: meeting.id,
        strategyId: meeting.strategyId,
        meetingType: meeting.meetingType,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt.toISOString(),
        expectedDuration: meeting.expectedDuration,
        startedAt: meeting.startedAt?.toISOString() ?? null,
        endedAt: meeting.endedAt?.toISOString() ?? null,
        actualDuration: meeting.actualDuration,
        participantsCount: meeting.participants.length,
        agendaItemsCount: meeting.agendaItems.length,
        decisionsCount: meeting.decisions.length,
        status: meeting.status,
        isOverdue: meeting.isOverdue,
        facilitatorUserId: meeting.facilitatorUserId,
        facilitatorName: meeting.facilitatorUserId ? facilitatorNames[meeting.facilitatorUserId] ?? null : null,
        createdBy: meeting.createdBy,
        createdAt: meeting.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
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

    // 1. Criar entidade
    const meetingResult = WarRoomMeeting.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      strategyId: meetingData.strategyId,
      meetingType,
      title: meetingData.title,
      description: meetingData.description,
      scheduledAt,
      expectedDuration: meetingData.expectedDuration,
      participants: meetingData.participants,
      facilitatorUserId: meetingData.facilitatorUserId ?? context.userId,
      createdBy: context.userId,
    });

    if (Result.isFail(meetingResult)) {
      return NextResponse.json({ error: meetingResult.error }, { status: 400 });
    }

    const meeting = meetingResult.value;

    // 2. Gerar pauta automática se solicitado
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
        for (const item of agendaResult.value.items) {
          meeting.addAgendaItem({
            title: item.title,
            presenter: item.presenter,
            duration: item.duration,
          });
        }
      }
    }

    // 3. Persistir
    const repository = container.resolve<IWarRoomMeetingRepository>(
      STRATEGIC_TOKENS.WarRoomMeetingRepository
    );
    await repository.save(meeting);

    return NextResponse.json(
      {
        id: meeting.id,
        meetingType: meeting.meetingType,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt.toISOString(),
        expectedDuration: meeting.expectedDuration,
        agendaItems: meeting.agendaItems,
        status: meeting.status,
        facilitatorUserId: meeting.facilitatorUserId,
        createdBy: meeting.createdBy,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/war-room/meetings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
