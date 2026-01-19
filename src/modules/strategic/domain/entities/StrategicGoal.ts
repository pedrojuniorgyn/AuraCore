/**
 * Entity: StrategicGoal (Aggregate Root)
 * Metas estratégicas com cascateamento
 * 
 * @module strategic/domain/entities
 * @see ADR-0021
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { CascadeLevel } from '../value-objects/CascadeLevel';
import { GoalStatus } from '../value-objects/GoalStatus';

type Polarity = 'UP' | 'DOWN';

interface StrategicGoalProps {
  organizationId: number;
  branchId: number;
  perspectiveId: string;
  parentGoalId: string | null;
  code: string;
  description: string;
  cascadeLevel: CascadeLevel;
  targetValue: number;
  currentValue: number;
  baselineValue: number | null;
  unit: string;
  polarity: Polarity;
  weight: number;
  ownerUserId: string;
  ownerBranchId: number;
  startDate: Date;
  dueDate: Date;
  status: GoalStatus;
  mapPositionX: number | null;
  mapPositionY: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateGoalProps {
  organizationId: number;
  branchId: number;
  perspectiveId: string;
  parentGoalId?: string;
  code: string;
  description: string;
  cascadeLevel: CascadeLevel;
  targetValue: number;
  baselineValue?: number;
  unit: string;
  polarity?: Polarity;
  weight: number;
  ownerUserId: string;
  ownerBranchId: number;
  startDate: Date;
  dueDate: Date;
  createdBy: string;
}

export class StrategicGoal extends AggregateRoot<string> {
  private readonly props: StrategicGoalProps;

  private constructor(id: string, props: StrategicGoalProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get perspectiveId(): string { return this.props.perspectiveId; }
  get parentGoalId(): string | null { return this.props.parentGoalId; }
  get code(): string { return this.props.code; }
  get description(): string { return this.props.description; }
  get cascadeLevel(): CascadeLevel { return this.props.cascadeLevel; }
  get targetValue(): number { return this.props.targetValue; }
  get currentValue(): number { return this.props.currentValue; }
  get baselineValue(): number | null { return this.props.baselineValue; }
  get unit(): string { return this.props.unit; }
  get polarity(): Polarity { return this.props.polarity; }
  get weight(): number { return this.props.weight; }
  get ownerUserId(): string { return this.props.ownerUserId; }
  get ownerBranchId(): number { return this.props.ownerBranchId; }
  get startDate(): Date { return this.props.startDate; }
  get dueDate(): Date { return this.props.dueDate; }
  get status(): GoalStatus { return this.props.status; }
  get mapPositionX(): number | null { return this.props.mapPositionX; }
  get mapPositionY(): number | null { return this.props.mapPositionY; }
  get createdBy(): string { return this.props.createdBy; }

  // Computed
  get progress(): number {
    const baseline = this.props.baselineValue ?? 0;
    const target = this.props.targetValue;
    
    if (target === baseline) return 100;
    
    const progress = ((this.props.currentValue - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateGoalProps): Result<StrategicGoal, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.perspectiveId) return Result.fail('perspectiveId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (!props.description?.trim()) return Result.fail('description é obrigatório');
    if (!props.cascadeLevel) return Result.fail('cascadeLevel é obrigatório');
    if (props.targetValue === undefined) return Result.fail('targetValue é obrigatório');
    if (!props.unit?.trim()) return Result.fail('unit é obrigatório');
    if (props.weight < 0 || props.weight > 100) return Result.fail('weight deve ser entre 0 e 100');
    if (!props.ownerUserId) return Result.fail('ownerUserId é obrigatório');
    if (!props.ownerBranchId) return Result.fail('ownerBranchId é obrigatório');
    if (!props.startDate) return Result.fail('startDate é obrigatório');
    if (!props.dueDate) return Result.fail('dueDate é obrigatório');
    if (props.dueDate <= props.startDate) {
      return Result.fail('dueDate deve ser posterior a startDate');
    }
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new StrategicGoal(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      perspectiveId: props.perspectiveId,
      parentGoalId: props.parentGoalId ?? null,
      code: props.code.trim(),
      description: props.description.trim(),
      cascadeLevel: props.cascadeLevel,
      targetValue: props.targetValue,
      currentValue: props.baselineValue ?? 0,
      baselineValue: props.baselineValue ?? null,
      unit: props.unit.trim(),
      polarity: props.polarity ?? 'UP',
      weight: props.weight,
      ownerUserId: props.ownerUserId,
      ownerBranchId: props.ownerBranchId,
      startDate: props.startDate,
      dueDate: props.dueDate,
      status: GoalStatus.NOT_STARTED,
      mapPositionX: null,
      mapPositionY: null,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: StrategicGoalProps & { id: string }): Result<StrategicGoal, string> {
    return Result.ok(new StrategicGoal(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      perspectiveId: props.perspectiveId,
      parentGoalId: props.parentGoalId,
      code: props.code,
      description: props.description,
      cascadeLevel: props.cascadeLevel,
      targetValue: props.targetValue,
      currentValue: props.currentValue,
      baselineValue: props.baselineValue,
      unit: props.unit,
      polarity: props.polarity,
      weight: props.weight,
      ownerUserId: props.ownerUserId,
      ownerBranchId: props.ownerBranchId,
      startDate: props.startDate,
      dueDate: props.dueDate,
      status: props.status,
      mapPositionX: props.mapPositionX,
      mapPositionY: props.mapPositionY,
      createdBy: props.createdBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Atualiza o progresso da meta
   */
  updateProgress(newValue: number): Result<void, string> {
    if (this.props.status.isTerminal) {
      return Result.fail('Não é possível atualizar meta com status terminal');
    }
    
    (this.props as { currentValue: number }).currentValue = newValue;
    this.touch();
    
    // Atualizar status baseado no progresso
    this.recalculateStatus();
    
    // Verificar se atingiu a meta
    if (this.progress >= 100) {
      this.achieve();
    }
    
    return Result.ok(undefined);
  }

  /**
   * Marca a meta como atingida
   */
  achieve(): Result<void, string> {
    if (this.props.status.isTerminal) {
      return Result.fail('Meta já está em status terminal');
    }
    
    (this.props as { status: GoalStatus }).status = GoalStatus.ACHIEVED;
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'GOAL_ACHIEVED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'StrategicGoal',
      payload: { 
        goalId: this.id, 
        goalCode: this.code,
        achievedValue: this.currentValue,
        targetValue: this.targetValue,
      },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Atualiza a posição no mapa estratégico
   */
  updateMapPosition(x: number, y: number): Result<void, string> {
    (this.props as { mapPositionX: number }).mapPositionX = x;
    (this.props as { mapPositionY: number }).mapPositionY = y;
    this.touch();
    return Result.ok(undefined);
  }

  private recalculateStatus(): void {
    const now = new Date();
    const progress = this.progress;
    
    // Calcular progresso esperado baseado no tempo
    const totalDays = (this.dueDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = (elapsedDays / totalDays) * 100;
    
    if (now < this.startDate) {
      (this.props as { status: GoalStatus }).status = GoalStatus.NOT_STARTED;
    } else if (now > this.dueDate && progress < 100) {
      (this.props as { status: GoalStatus }).status = GoalStatus.DELAYED;
    } else if (progress >= expectedProgress * 0.9) {
      (this.props as { status: GoalStatus }).status = GoalStatus.ON_TRACK;
    } else if (progress >= expectedProgress * 0.7) {
      (this.props as { status: GoalStatus }).status = GoalStatus.AT_RISK;
    } else {
      (this.props as { status: GoalStatus }).status = GoalStatus.DELAYED;
    }
  }
}
