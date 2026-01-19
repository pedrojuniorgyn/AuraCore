/**
 * Entity: IdeaBox (Aggregate Root)
 * Banco de ideias para melhoria contínua
 * 
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { IdeaStatus } from '../value-objects/IdeaStatus';

export type IdeaSourceType = 'SUGGESTION' | 'COMPLAINT' | 'OBSERVATION' | 'BENCHMARK' | 'AUDIT' | 'CLIENT_FEEDBACK';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConversionTarget = 'ACTION_PLAN' | 'MEETING_ITEM' | 'SWOT_ITEM' | 'PROJECT' | 'GOAL' | 'KPI';

interface IdeaBoxProps {
  organizationId: number;
  branchId: number;
  code: string;
  title: string;
  description: string;
  sourceType: IdeaSourceType;
  category: string | null;
  submittedBy: string;
  submittedByName: string | null;
  department: string | null;
  urgency: Priority;
  importance: Priority;
  estimatedImpact: string | null;
  estimatedCost: number | null;
  estimatedCostCurrency: string;
  estimatedBenefit: number | null;
  estimatedBenefitCurrency: string;
  status: IdeaStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  convertedTo: ConversionTarget | null;
  convertedEntityId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateIdeaProps {
  organizationId: number;
  branchId: number;
  code: string;
  title: string;
  description: string;
  sourceType: IdeaSourceType;
  category?: string;
  submittedBy: string;
  submittedByName?: string;
  department?: string;
  urgency?: Priority;
  importance?: Priority;
}

export class IdeaBox extends AggregateRoot<string> {
  private readonly props: IdeaBoxProps;

  private constructor(id: string, props: IdeaBoxProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get code(): string { return this.props.code; }
  get title(): string { return this.props.title; }
  get description(): string { return this.props.description; }
  get sourceType(): IdeaSourceType { return this.props.sourceType; }
  get category(): string | null { return this.props.category; }
  get submittedBy(): string { return this.props.submittedBy; }
  get submittedByName(): string | null { return this.props.submittedByName; }
  get department(): string | null { return this.props.department; }
  get urgency(): Priority { return this.props.urgency; }
  get importance(): Priority { return this.props.importance; }
  get estimatedImpact(): string | null { return this.props.estimatedImpact; }
  get estimatedCost(): number | null { return this.props.estimatedCost; }
  get estimatedCostCurrency(): string { return this.props.estimatedCostCurrency; }
  get estimatedBenefit(): number | null { return this.props.estimatedBenefit; }
  get estimatedBenefitCurrency(): string { return this.props.estimatedBenefitCurrency; }
  get status(): IdeaStatus { return this.props.status; }
  get reviewedBy(): string | null { return this.props.reviewedBy; }
  get reviewedAt(): Date | null { return this.props.reviewedAt; }
  get reviewNotes(): string | null { return this.props.reviewNotes; }
  get convertedTo(): ConversionTarget | null { return this.props.convertedTo; }
  get convertedEntityId(): string | null { return this.props.convertedEntityId; }
  get convertedAt(): Date | null { return this.props.convertedAt; }

  // Computed - Matriz Eisenhower
  get priorityQuadrant(): string {
    if (this.urgency === 'HIGH' && this.importance === 'HIGH') return 'DO_FIRST';
    if (this.urgency === 'LOW' && this.importance === 'HIGH') return 'SCHEDULE';
    if (this.urgency === 'HIGH' && this.importance === 'LOW') return 'DELEGATE';
    return 'ELIMINATE';
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateIdeaProps): Result<IdeaBox, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (!props.title?.trim()) return Result.fail('title é obrigatório');
    if (!props.description?.trim()) return Result.fail('description é obrigatório');
    if (!props.sourceType) return Result.fail('sourceType é obrigatório');
    if (!props.submittedBy) return Result.fail('submittedBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new IdeaBox(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      code: props.code.trim(),
      title: props.title.trim(),
      description: props.description.trim(),
      sourceType: props.sourceType,
      category: props.category?.trim() ?? null,
      submittedBy: props.submittedBy,
      submittedByName: props.submittedByName?.trim() ?? null,
      department: props.department?.trim() ?? null,
      urgency: props.urgency ?? 'MEDIUM',
      importance: props.importance ?? 'MEDIUM',
      estimatedImpact: null,
      estimatedCost: null,
      estimatedCostCurrency: 'BRL',
      estimatedBenefit: null,
      estimatedBenefitCurrency: 'BRL',
      status: IdeaStatus.SUBMITTED,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      convertedTo: null,
      convertedEntityId: null,
      convertedAt: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: IdeaBoxProps & { id: string }): Result<IdeaBox, string> {
    return Result.ok(new IdeaBox(props.id, { ...props }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Envia para revisão
   */
  startReview(): Result<void, string> {
    if (!this.props.status.canTransitionTo(IdeaStatus.UNDER_REVIEW)) {
      return Result.fail('Não é possível iniciar revisão neste status');
    }
    
    (this.props as { status: IdeaStatus }).status = IdeaStatus.UNDER_REVIEW;
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Aprova a ideia
   */
  approve(reviewedBy: string, notes?: string): Result<void, string> {
    if (!this.props.status.canTransitionTo(IdeaStatus.APPROVED)) {
      return Result.fail('Não é possível aprovar neste status');
    }
    
    (this.props as { status: IdeaStatus }).status = IdeaStatus.APPROVED;
    (this.props as { reviewedBy: string }).reviewedBy = reviewedBy;
    (this.props as { reviewedAt: Date }).reviewedAt = new Date();
    (this.props as { reviewNotes: string | null }).reviewNotes = notes ?? null;
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'IDEA_APPROVED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'IdeaBox',
      payload: { ideaCode: this.code, reviewedBy },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Rejeita a ideia
   */
  reject(reviewedBy: string, notes: string): Result<void, string> {
    if (!this.props.status.canTransitionTo(IdeaStatus.REJECTED)) {
      return Result.fail('Não é possível rejeitar neste status');
    }
    
    if (!notes?.trim()) {
      return Result.fail('Justificativa de rejeição é obrigatória');
    }
    
    (this.props as { status: IdeaStatus }).status = IdeaStatus.REJECTED;
    (this.props as { reviewedBy: string }).reviewedBy = reviewedBy;
    (this.props as { reviewedAt: Date }).reviewedAt = new Date();
    (this.props as { reviewNotes: string }).reviewNotes = notes;
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Converte a ideia para outra entidade
   */
  convert(target: ConversionTarget, entityId: string): Result<void, string> {
    if (!this.props.status.canTransitionTo(IdeaStatus.CONVERTED)) {
      return Result.fail('Não é possível converter neste status');
    }
    
    (this.props as { status: IdeaStatus }).status = IdeaStatus.CONVERTED;
    (this.props as { convertedTo: ConversionTarget }).convertedTo = target;
    (this.props as { convertedEntityId: string }).convertedEntityId = entityId;
    (this.props as { convertedAt: Date }).convertedAt = new Date();
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'IDEA_CONVERTED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'IdeaBox',
      payload: { 
        ideaCode: this.code, 
        convertedTo: target, 
        convertedEntityId: entityId,
      },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Atualiza estimativas
   */
  updateEstimates(props: {
    estimatedImpact?: string;
    estimatedCost?: number;
    estimatedBenefit?: number;
  }): Result<void, string> {
    if (this.props.status.isTerminal) {
      return Result.fail('Não é possível atualizar ideia com status terminal');
    }
    
    if (props.estimatedImpact !== undefined) {
      (this.props as { estimatedImpact: string | null }).estimatedImpact = props.estimatedImpact;
    }
    if (props.estimatedCost !== undefined) {
      (this.props as { estimatedCost: number | null }).estimatedCost = props.estimatedCost;
    }
    if (props.estimatedBenefit !== undefined) {
      (this.props as { estimatedBenefit: number | null }).estimatedBenefit = props.estimatedBenefit;
    }
    
    this.touch();
    return Result.ok(undefined);
  }
}
