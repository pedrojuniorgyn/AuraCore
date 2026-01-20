/**
 * Entity: WarRoomMeeting (Aggregate Root)
 * Reuniões executivas para decisões estratégicas
 * 
 * @module strategic/domain/entities
 * @see ADR-0023
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type MeetingType = 'BOARD' | 'DIRECTOR' | 'MANAGER' | 'TACTICAL' | 'EMERGENCY';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface AgendaItem {
  id: string;
  title: string;
  presenter?: string;
  duration?: number; // minutos
  completed?: boolean;
}

interface Decision {
  id: string;
  description: string;
  responsible: string;
  deadline?: Date;
  actionPlanId?: string;
}

interface WarRoomMeetingProps {
  organizationId: number;
  branchId: number;
  strategyId: string | null;
  meetingType: MeetingType;
  title: string;
  description: string | null;
  scheduledAt: Date;
  expectedDuration: number; // minutos
  startedAt: Date | null;
  endedAt: Date | null;
  participants: string[]; // userIds
  agendaItems: AgendaItem[];
  decisions: Decision[];
  minutes: string | null;
  minutesGeneratedAt: Date | null;
  status: MeetingStatus;
  facilitatorUserId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWarRoomMeetingProps {
  organizationId: number;
  branchId: number;
  strategyId?: string;
  meetingType: MeetingType;
  title: string;
  description?: string;
  scheduledAt: Date;
  expectedDuration?: number;
  participants?: string[];
  facilitatorUserId: string;
  createdBy: string;
}

export class WarRoomMeeting extends AggregateRoot<string> {
  private readonly props: WarRoomMeetingProps;

  private constructor(id: string, props: WarRoomMeetingProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get strategyId(): string | null { return this.props.strategyId; }
  get meetingType(): MeetingType { return this.props.meetingType; }
  get title(): string { return this.props.title; }
  get description(): string | null { return this.props.description; }
  get scheduledAt(): Date { return this.props.scheduledAt; }
  get expectedDuration(): number { return this.props.expectedDuration; }
  get startedAt(): Date | null { return this.props.startedAt; }
  get endedAt(): Date | null { return this.props.endedAt; }
  get participants(): string[] { return [...this.props.participants]; }
  get agendaItems(): AgendaItem[] { return [...this.props.agendaItems]; }
  get decisions(): Decision[] { return [...this.props.decisions]; }
  get minutes(): string | null { return this.props.minutes; }
  get minutesGeneratedAt(): Date | null { return this.props.minutesGeneratedAt; }
  get status(): MeetingStatus { return this.props.status; }
  get facilitatorUserId(): string { return this.props.facilitatorUserId; }
  get createdBy(): string { return this.props.createdBy; }

  // Computed
  get actualDuration(): number | null {
    if (!this.props.startedAt || !this.props.endedAt) return null;
    return Math.round((this.props.endedAt.getTime() - this.props.startedAt.getTime()) / 60000);
  }

  get isOverdue(): boolean {
    return this.props.status === 'SCHEDULED' && new Date() > this.props.scheduledAt;
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateWarRoomMeetingProps): Result<WarRoomMeeting, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.meetingType) return Result.fail('meetingType é obrigatório');
    if (!props.title?.trim()) return Result.fail('title é obrigatório');
    if (!props.scheduledAt) return Result.fail('scheduledAt é obrigatório');
    if (!props.facilitatorUserId) return Result.fail('facilitatorUserId é obrigatório');
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new WarRoomMeeting(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      strategyId: props.strategyId ?? null,
      meetingType: props.meetingType,
      title: props.title.trim(),
      description: props.description?.trim() ?? null,
      scheduledAt: props.scheduledAt,
      expectedDuration: props.expectedDuration ?? 60,
      startedAt: null,
      endedAt: null,
      participants: props.participants ?? [],
      agendaItems: [],
      decisions: [],
      minutes: null,
      minutesGeneratedAt: null,
      status: 'SCHEDULED',
      facilitatorUserId: props.facilitatorUserId,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: WarRoomMeetingProps & { id: string }): Result<WarRoomMeeting, string> {
    return Result.ok(new WarRoomMeeting(props.id, {
      ...props,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Adiciona item à pauta
   */
  addAgendaItem(item: Omit<AgendaItem, 'id' | 'completed'>): Result<void, string> {
    if (!item.title?.trim()) {
      return Result.fail('Título do item é obrigatório');
    }

    this.props.agendaItems.push({
      id: globalThis.crypto.randomUUID(),
      title: item.title.trim(),
      presenter: item.presenter,
      duration: item.duration,
      completed: false,
    });

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Adiciona participante
   */
  addParticipant(userId: string): Result<void, string> {
    if (!userId) return Result.fail('userId é obrigatório');
    
    if (!this.props.participants.includes(userId)) {
      this.props.participants.push(userId);
      this.touch();
    }
    
    return Result.ok(undefined);
  }

  /**
   * Inicia a reunião
   */
  start(): Result<void, string> {
    if (this.props.status !== 'SCHEDULED') {
      return Result.fail(`Não é possível iniciar reunião com status ${this.props.status}`);
    }

    (this.props as { startedAt: Date }).startedAt = new Date();
    (this.props as { status: MeetingStatus }).status = 'IN_PROGRESS';

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'WAR_ROOM_MEETING_STARTED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'WarRoomMeeting',
      payload: { meetingType: this.meetingType, title: this.title },
    });

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Registra decisão
   */
  recordDecision(decision: Omit<Decision, 'id'>): Result<void, string> {
    if (this.props.status !== 'IN_PROGRESS') {
      return Result.fail('Só é possível registrar decisões durante a reunião');
    }
    if (!decision.description?.trim()) {
      return Result.fail('Descrição da decisão é obrigatória');
    }
    if (!decision.responsible) {
      return Result.fail('Responsável pela decisão é obrigatório');
    }

    this.props.decisions.push({
      id: globalThis.crypto.randomUUID(),
      description: decision.description.trim(),
      responsible: decision.responsible,
      deadline: decision.deadline,
      actionPlanId: decision.actionPlanId,
    });

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'WAR_ROOM_DECISION_RECORDED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'WarRoomMeeting',
      payload: { decisionDescription: decision.description },
    });

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Finaliza a reunião
   */
  complete(minutesText?: string): Result<void, string> {
    if (this.props.status !== 'IN_PROGRESS') {
      return Result.fail(`Não é possível finalizar reunião com status ${this.props.status}`);
    }

    const now = new Date();
    (this.props as { endedAt: Date }).endedAt = now;
    (this.props as { status: MeetingStatus }).status = 'COMPLETED';

    if (minutesText) {
      (this.props as { minutes: string }).minutes = minutesText;
      (this.props as { minutesGeneratedAt: Date }).minutesGeneratedAt = now;
    }

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'WAR_ROOM_MEETING_COMPLETED',
      occurredAt: now,
      aggregateId: this.id,
      aggregateType: 'WarRoomMeeting',
      payload: { 
        decisionsCount: this.props.decisions.length,
        actualDuration: this.actualDuration,
      },
    });

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Cancela a reunião
   */
  cancel(reason?: string): Result<void, string> {
    if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
      return Result.fail(`Não é possível cancelar reunião com status ${this.props.status}`);
    }

    (this.props as { status: MeetingStatus }).status = 'CANCELLED';

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'WAR_ROOM_MEETING_CANCELLED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'WarRoomMeeting',
      payload: { reason },
    });

    this.touch();
    return Result.ok(undefined);
  }
}
