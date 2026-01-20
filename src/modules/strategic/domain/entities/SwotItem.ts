/**
 * Entity: SwotItem (Aggregate Root)
 * Item de análise SWOT (Strengths, Weaknesses, Opportunities, Threats)
 * 
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type SwotQuadrant = 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT';
export type SwotStatus = 'IDENTIFIED' | 'ANALYZING' | 'ACTION_DEFINED' | 'MONITORING' | 'RESOLVED';
export type SwotCategory = 'MARKET' | 'TECHNOLOGY' | 'FINANCIAL' | 'OPERATIONAL' | 'PEOPLE' | 'REGULATORY' | 'COMPETITIVE' | 'INFRASTRUCTURE' | 'OTHER';

interface SwotItemProps {
  organizationId: number;
  branchId: number;
  strategyId: string | null;
  quadrant: SwotQuadrant;
  title: string;
  description: string | null;
  impactScore: number; // 1-5
  probabilityScore: number; // 1-5
  priorityScore: number; // Calculado: impact * probability
  category: SwotCategory | null;
  convertedToActionPlanId: string | null;
  convertedToGoalId: string | null;
  status: SwotStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateSwotItemProps {
  organizationId: number;
  branchId: number;
  strategyId?: string;
  quadrant: SwotQuadrant;
  title: string;
  description?: string;
  impactScore: number;
  probabilityScore?: number;
  category?: SwotCategory;
  createdBy: string;
}

export class SwotItem extends AggregateRoot<string> {
  private readonly props: SwotItemProps;

  private constructor(id: string, props: SwotItemProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get strategyId(): string | null { return this.props.strategyId; }
  get quadrant(): SwotQuadrant { return this.props.quadrant; }
  get title(): string { return this.props.title; }
  get description(): string | null { return this.props.description; }
  get impactScore(): number { return this.props.impactScore; }
  get probabilityScore(): number { return this.props.probabilityScore; }
  get priorityScore(): number { return this.props.priorityScore; }
  get category(): SwotCategory | null { return this.props.category; }
  get convertedToActionPlanId(): string | null { return this.props.convertedToActionPlanId; }
  get convertedToGoalId(): string | null { return this.props.convertedToGoalId; }
  get status(): SwotStatus { return this.props.status; }
  get createdBy(): string { return this.props.createdBy; }

  // Computed
  get isExternalFactor(): boolean {
    return this.props.quadrant === 'OPPORTUNITY' || this.props.quadrant === 'THREAT';
  }

  get isInternalFactor(): boolean {
    return this.props.quadrant === 'STRENGTH' || this.props.quadrant === 'WEAKNESS';
  }

  get hasBeenConverted(): boolean {
    return this.props.convertedToActionPlanId !== null || this.props.convertedToGoalId !== null;
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateSwotItemProps): Result<SwotItem, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.quadrant) return Result.fail('quadrant é obrigatório');
    if (!props.title?.trim()) return Result.fail('title é obrigatório');
    if (props.impactScore < 1 || props.impactScore > 5) {
      return Result.fail('impactScore deve ser entre 1 e 5');
    }
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    // Fatores externos (O e T) devem ter probabilityScore
    const isExternal = props.quadrant === 'OPPORTUNITY' || props.quadrant === 'THREAT';
    const probabilityScore = props.probabilityScore ?? (isExternal ? 3 : 3); // Default 3
    
    if (probabilityScore < 1 || probabilityScore > 5) {
      return Result.fail('probabilityScore deve ser entre 1 e 5');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();
    const priorityScore = props.impactScore * probabilityScore;

    return Result.ok(new SwotItem(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      strategyId: props.strategyId ?? null,
      quadrant: props.quadrant,
      title: props.title.trim(),
      description: props.description?.trim() ?? null,
      impactScore: props.impactScore,
      probabilityScore,
      priorityScore,
      category: props.category ?? null,
      convertedToActionPlanId: null,
      convertedToGoalId: null,
      status: 'IDENTIFIED',
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: SwotItemProps & { id: string }): Result<SwotItem, string> {
    return Result.ok(new SwotItem(props.id, {
      ...props,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Atualiza scores e recalcula prioridade
   */
  updateScores(impactScore: number, probabilityScore?: number): Result<void, string> {
    if (impactScore < 1 || impactScore > 5) {
      return Result.fail('impactScore deve ser entre 1 e 5');
    }
    
    const newProbability = probabilityScore ?? this.props.probabilityScore;
    if (newProbability < 1 || newProbability > 5) {
      return Result.fail('probabilityScore deve ser entre 1 e 5');
    }

    (this.props as { impactScore: number }).impactScore = impactScore;
    (this.props as { probabilityScore: number }).probabilityScore = newProbability;
    (this.props as { priorityScore: number }).priorityScore = impactScore * newProbability;
    
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Avança o status do item
   */
  advanceStatus(newStatus: SwotStatus): Result<void, string> {
    const validTransitions: Record<SwotStatus, SwotStatus[]> = {
      IDENTIFIED: ['ANALYZING', 'RESOLVED'],
      ANALYZING: ['ACTION_DEFINED', 'RESOLVED'],
      ACTION_DEFINED: ['MONITORING', 'RESOLVED'],
      MONITORING: ['RESOLVED', 'ACTION_DEFINED'],
      RESOLVED: [],
    };

    if (!validTransitions[this.props.status].includes(newStatus)) {
      return Result.fail(`Transição de ${this.props.status} para ${newStatus} não permitida`);
    }

    (this.props as { status: SwotStatus }).status = newStatus;
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Converte para Plano de Ação
   */
  convertToActionPlan(actionPlanId: string): Result<void, string> {
    if (this.hasBeenConverted) {
      return Result.fail('Item já foi convertido');
    }

    (this.props as { convertedToActionPlanId: string }).convertedToActionPlanId = actionPlanId;
    (this.props as { status: SwotStatus }).status = 'ACTION_DEFINED';
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'SWOT_ITEM_CONVERTED_TO_ACTION_PLAN',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'SwotItem',
      payload: { actionPlanId },
    });
    
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Converte para Objetivo Estratégico
   */
  convertToGoal(goalId: string): Result<void, string> {
    if (this.hasBeenConverted) {
      return Result.fail('Item já foi convertido');
    }

    (this.props as { convertedToGoalId: string }).convertedToGoalId = goalId;
    (this.props as { status: SwotStatus }).status = 'ACTION_DEFINED';
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'SWOT_ITEM_CONVERTED_TO_GOAL',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'SwotItem',
      payload: { goalId },
    });
    
    this.touch();
    return Result.ok(undefined);
  }
}
