/**
 * Entity: Strategy (Aggregate Root)
 * Representa o planejamento estratégico da organização
 * 
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'REVIEWING' | 'ARCHIVED';
export type StrategyVersionType = 'ACTUAL' | 'BUDGET' | 'FORECAST' | 'SCENARIO';

interface StrategyProps {
  organizationId: number;
  branchId: number;
  name: string;
  vision: string | null;
  mission: string | null;
  values: string[];
  startDate: Date;
  endDate: Date;
  status: StrategyStatus;
  versionType: StrategyVersionType;
  versionName?: string;
  parentStrategyId?: string;
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateStrategyProps {
  organizationId: number;
  branchId: number;
  name: string;
  vision?: string;
  mission?: string;
  values?: string[];
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

export class Strategy extends AggregateRoot<string> {
  private readonly props: StrategyProps;

  private constructor(id: string, props: StrategyProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get name(): string { return this.props.name; }
  get vision(): string | null { return this.props.vision; }
  get mission(): string | null { return this.props.mission; }
  get values(): string[] { return [...this.props.values]; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get status(): StrategyStatus { return this.props.status; }
  get versionType(): StrategyVersionType { return this.props.versionType; }
  get versionName(): string | undefined { return this.props.versionName; }
  get parentStrategyId(): string | undefined { return this.props.parentStrategyId; }
  get isLocked(): boolean { return this.props.isLocked; }
  get lockedAt(): Date | undefined { return this.props.lockedAt; }
  get lockedBy(): string | undefined { return this.props.lockedBy; }
  get createdBy(): string { return this.props.createdBy; }

  get isEditable(): boolean {
    return !this.props.isLocked && this.props.status !== 'ARCHIVED';
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateStrategyProps): Result<Strategy, string> {
    // Validações
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.name?.trim()) return Result.fail('name é obrigatório');
    if (!props.startDate) return Result.fail('startDate é obrigatório');
    if (!props.endDate) return Result.fail('endDate é obrigatório');
    if (props.endDate <= props.startDate) {
      return Result.fail('endDate deve ser posterior a startDate');
    }
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const strategy = new Strategy(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      name: props.name.trim(),
      vision: props.vision?.trim() ?? null,
      mission: props.mission?.trim() ?? null,
      values: props.values ?? [],
      startDate: props.startDate,
      endDate: props.endDate,
      status: 'DRAFT',
      versionType: 'ACTUAL',
      isLocked: false,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(strategy);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: StrategyProps & { id: string }): Result<Strategy, string> {
    return Result.ok(new Strategy(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      name: props.name,
      vision: props.vision,
      mission: props.mission,
      values: props.values,
      startDate: props.startDate,
      endDate: props.endDate,
      status: props.status,
      versionType: props.versionType,
      versionName: props.versionName,
      parentStrategyId: props.parentStrategyId,
      isLocked: props.isLocked,
      lockedAt: props.lockedAt,
      lockedBy: props.lockedBy,
      createdBy: props.createdBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }

  // Métodos de negócio
  
  /**
   * Ativa a estratégia (DRAFT/REVIEWING → ACTIVE)
   */
  activate(): Result<void, string> {
    if (this.props.status !== 'DRAFT' && this.props.status !== 'REVIEWING') {
      return Result.fail(`Não é possível ativar estratégia com status ${this.props.status}`);
    }
    
    (this.props as { status: StrategyStatus }).status = 'ACTIVE';
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STRATEGY_ACTIVATED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'Strategy',
      payload: { strategyId: this.id, name: this.name },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Arquiva a estratégia
   */
  archive(): Result<void, string> {
    if (this.props.status === 'ARCHIVED') {
      return Result.fail('Estratégia já está arquivada');
    }
    
    (this.props as { status: StrategyStatus }).status = 'ARCHIVED';
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STRATEGY_ARCHIVED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'Strategy',
      payload: { strategyId: this.id },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Estende a data final da estratégia
   */
  extend(newEndDate: Date): Result<void, string> {
    if (newEndDate <= this.props.endDate) {
      return Result.fail('Nova data deve ser posterior à data atual');
    }
    
    (this.props as { endDate: Date }).endDate = newEndDate;
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Atualiza nome e descrições
   */
  updateDetails(props: {
    name?: string;
    vision?: string;
    mission?: string;
    values?: string[];
  }): Result<void, string> {
    if (this.props.status === 'ARCHIVED') {
      return Result.fail('Não é possível atualizar estratégia arquivada');
    }

    if (props.name !== undefined) {
      if (!props.name.trim()) {
        return Result.fail('name não pode ser vazio');
      }
      (this.props as { name: string }).name = props.name.trim();
    }

    if (props.vision !== undefined) {
      (this.props as { vision: string | null }).vision = props.vision?.trim() || null;
    }

    if (props.mission !== undefined) {
      (this.props as { mission: string | null }).mission = props.mission?.trim() || null;
    }

    if (props.values !== undefined) {
      (this.props as { values: string[] }).values = props.values;
    }

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Cria uma nova versão a partir da estratégia atual (ACTUAL)
   */
  createVersion(
    versionType: Exclude<StrategyVersionType, 'ACTUAL'>,
    versionName: string,
    createdBy: string
  ): Result<Strategy, string> {
    if (this.props.versionType !== 'ACTUAL') {
      return Result.fail('Can only create versions from ACTUAL strategy');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const version = new Strategy(id, {
      ...this.props,
      versionType,
      versionName,
      parentStrategyId: this.id,
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined,
      status: 'DRAFT',
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(version);
  }

  /**
   * Trava a versão para impedir edições
   */
  lock(lockedBy: string): Result<void, string> {
    if (this.props.isLocked) {
      return Result.fail('Strategy already locked');
    }
    if (this.props.versionType === 'ACTUAL') {
      return Result.fail('Cannot lock ACTUAL version');
    }

    (this.props as { isLocked: boolean }).isLocked = true;
    (this.props as { lockedAt: Date }).lockedAt = new Date();
    (this.props as { lockedBy: string }).lockedBy = lockedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Destrava a versão
   */
  unlock(): Result<void, string> {
    if (!this.props.isLocked) {
      return Result.fail('Strategy is not locked');
    }

    (this.props as { isLocked: boolean }).isLocked = false;
    (this.props as { lockedAt: Date | undefined }).lockedAt = undefined;
    (this.props as { lockedBy: string | undefined }).lockedBy = undefined;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Promove a versão para ACTUAL (substitui a versão atual)
   */
  promoteToActual(): Result<void, string> {
    if (this.props.versionType === 'ACTUAL') {
      return Result.fail('Already ACTUAL version');
    }
    if (!this.props.isLocked) {
      return Result.fail('Version must be locked before promoting');
    }

    // Lógica de promoção - trocar com a versão atual
    (this.props as { versionType: StrategyVersionType }).versionType = 'ACTUAL';
    (this.props as { parentStrategyId: string | undefined }).parentStrategyId = undefined;
    this.touch();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STRATEGY_VERSION_PROMOTED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'Strategy',
      payload: { strategyId: this.id, versionName: this.props.versionName },
    });

    return Result.ok(undefined);
  }
}
