/**
 * Entity: ActionPlan (Aggregate Root)
 * Planos de ação 5W2H com ciclo PDCA e reproposição
 * 
 * @module strategic/domain/entities
 * @see ADR-0020, ADR-0022
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { PDCACycle } from '../value-objects/PDCACycle';

export type ActionPlanStatus = 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ActionPlanProps {
  organizationId: number;
  branchId: number;
  goalId: string | null;
  code: string;
  // 5W2H
  what: string;
  why: string;
  whereLocation: string;
  whenStart: Date;
  whenEnd: Date;
  who: string;
  whoUserId: string;
  how: string;
  howMuchAmount: number | null;
  howMuchCurrency: string;
  // PDCA
  pdcaCycle: PDCACycle;
  completionPercent: number;
  // Reproposição
  parentActionPlanId: string | null;
  repropositionNumber: number;
  repropositionReason: string | null;
  // Status
  priority: Priority;
  status: ActionPlanStatus;
  evidenceUrls: string[];
  nextFollowUpDate: Date | null;
  // Auditoria
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateActionPlanProps {
  organizationId: number;
  branchId: number;
  goalId?: string;
  code: string;
  what: string;
  why: string;
  whereLocation: string;
  whenStart: Date;
  whenEnd: Date;
  who: string;
  whoUserId: string;
  how: string;
  howMuchAmount?: number;
  howMuchCurrency?: string;
  priority?: Priority;
  createdBy: string;
}

export class ActionPlan extends AggregateRoot<string> {
  private readonly props: ActionPlanProps;

  // Máximo de reproposições permitidas (ADR-0022)
  static readonly MAX_REPROPOSITIONS = 3;

  private constructor(id: string, props: ActionPlanProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get goalId(): string | null { return this.props.goalId; }
  get code(): string { return this.props.code; }
  get what(): string { return this.props.what; }
  get why(): string { return this.props.why; }
  get whereLocation(): string { return this.props.whereLocation; }
  get whenStart(): Date { return this.props.whenStart; }
  get whenEnd(): Date { return this.props.whenEnd; }
  get who(): string { return this.props.who; }
  get whoUserId(): string { return this.props.whoUserId; }
  get how(): string { return this.props.how; }
  get howMuchAmount(): number | null { return this.props.howMuchAmount; }
  get howMuchCurrency(): string { return this.props.howMuchCurrency; }
  get pdcaCycle(): PDCACycle { return this.props.pdcaCycle; }
  get completionPercent(): number { return this.props.completionPercent; }
  get parentActionPlanId(): string | null { return this.props.parentActionPlanId; }
  get repropositionNumber(): number { return this.props.repropositionNumber; }
  get repropositionReason(): string | null { return this.props.repropositionReason; }
  get priority(): Priority { return this.props.priority; }
  get status(): ActionPlanStatus { return this.props.status; }
  get evidenceUrls(): string[] { return [...this.props.evidenceUrls]; }
  get nextFollowUpDate(): Date | null { return this.props.nextFollowUpDate; }
  get createdBy(): string { return this.props.createdBy; }

  // Computed
  get isOverdue(): boolean {
    return new Date() > this.props.whenEnd && this.props.status !== 'COMPLETED';
  }

  get canRepropose(): boolean {
    return this.props.repropositionNumber < ActionPlan.MAX_REPROPOSITIONS;
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateActionPlanProps): Result<ActionPlan, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (!props.what?.trim()) return Result.fail('what é obrigatório');
    if (!props.why?.trim()) return Result.fail('why é obrigatório');
    if (!props.whereLocation?.trim()) return Result.fail('whereLocation é obrigatório');
    if (!props.whenStart) return Result.fail('whenStart é obrigatório');
    if (!props.whenEnd) return Result.fail('whenEnd é obrigatório');
    if (props.whenEnd <= props.whenStart) {
      return Result.fail('whenEnd deve ser posterior a whenStart');
    }
    if (!props.who?.trim()) return Result.fail('who é obrigatório');
    if (!props.whoUserId) return Result.fail('whoUserId é obrigatório');
    if (!props.how?.trim()) return Result.fail('how é obrigatório');
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new ActionPlan(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      goalId: props.goalId ?? null,
      code: props.code.trim(),
      what: props.what.trim(),
      why: props.why.trim(),
      whereLocation: props.whereLocation.trim(),
      whenStart: props.whenStart,
      whenEnd: props.whenEnd,
      who: props.who.trim(),
      whoUserId: props.whoUserId,
      how: props.how.trim(),
      howMuchAmount: props.howMuchAmount ?? null,
      howMuchCurrency: props.howMuchCurrency ?? 'BRL',
      pdcaCycle: PDCACycle.PLAN,
      completionPercent: 0,
      parentActionPlanId: null,
      repropositionNumber: 0,
      repropositionReason: null,
      priority: props.priority ?? 'MEDIUM',
      status: 'DRAFT',
      evidenceUrls: [],
      nextFollowUpDate: null,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: ActionPlanProps & { id: string }): Result<ActionPlan, string> {
    return Result.ok(new ActionPlan(props.id, {
      ...props,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Avança o ciclo PDCA
   */
  advancePDCA(reason?: string): Result<void, string> {
    if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
      return Result.fail('Não é possível avançar PDCA de plano finalizado');
    }

    const nextPhase = this.props.pdcaCycle.next();
    (this.props as { pdcaCycle: PDCACycle }).pdcaCycle = nextPhase;
    
    // Se está voltando para PLAN (ACT → PLAN), incrementa o ciclo
    if (nextPhase.isInitial) {
      this.addDomainEvent({
        eventId: globalThis.crypto.randomUUID(),
        eventType: 'PDCA_CYCLE_COMPLETED',
        occurredAt: new Date(),
        aggregateId: this.id,
        aggregateType: 'ActionPlan',
        payload: { planCode: this.code, reason },
      });
    }
    
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Atualiza o percentual de conclusão
   */
  updateProgress(percent: number): Result<void, string> {
    if (percent < 0 || percent > 100) {
      return Result.fail('Percentual deve ser entre 0 e 100');
    }
    
    (this.props as { completionPercent: number }).completionPercent = percent;
    
    if (percent === 100 && this.props.status !== 'COMPLETED') {
      (this.props as { status: ActionPlanStatus }).status = 'COMPLETED';
    }
    
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Adiciona evidência
   */
  addEvidence(url: string): Result<void, string> {
    if (!url?.trim()) {
      return Result.fail('URL da evidência é obrigatória');
    }
    
    this.props.evidenceUrls.push(url.trim());
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Cria reproposição (novo plano filho)
   */
  repropose(props: {
    reason: string;
    newWhenEnd: Date;
    newWhoUserId?: string;
    newWho?: string;
    createdBy: string;
  }): Result<ActionPlan, string> {
    if (!this.canRepropose) {
      return Result.fail(`Limite de ${ActionPlan.MAX_REPROPOSITIONS} reproposições atingido`);
    }
    
    const newCode = `${this.code}-R${this.repropositionNumber + 1}`;
    
    const childPlan = ActionPlan.create({
      organizationId: this.organizationId,
      branchId: this.branchId,
      goalId: this.goalId ?? undefined,
      code: newCode,
      what: this.what,
      why: this.why,
      whereLocation: this.whereLocation,
      whenStart: new Date(),
      whenEnd: props.newWhenEnd,
      who: props.newWho ?? this.who,
      whoUserId: props.newWhoUserId ?? this.whoUserId,
      how: this.how,
      howMuchAmount: this.howMuchAmount ?? undefined,
      howMuchCurrency: this.howMuchCurrency,
      priority: this.priority,
      createdBy: props.createdBy,
    });
    
    if (Result.isFail(childPlan)) {
      return childPlan;
    }
    
    // Configurar relação de reproposição
    const child = childPlan.value;
    (child.props as { parentActionPlanId: string }).parentActionPlanId = this.id;
    (child.props as { repropositionNumber: number }).repropositionNumber = this.repropositionNumber + 1;
    (child.props as { repropositionReason: string }).repropositionReason = props.reason;
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'ACTION_PLAN_REPROPOSED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'ActionPlan',
      payload: { 
        originalPlanId: this.id,
        newPlanId: child.id,
        repropositionNumber: child.repropositionNumber,
        reason: props.reason,
      },
    });
    
    return Result.ok(child);
  }

  /**
   * Agenda próximo follow-up
   */
  scheduleFollowUp(date: Date): Result<void, string> {
    if (date <= new Date()) {
      return Result.fail('Data do follow-up deve ser futura');
    }
    
    (this.props as { nextFollowUpDate: Date }).nextFollowUpDate = date;
    this.touch();
    return Result.ok(undefined);
  }
}
