/**
 * Entity: Strategy (Aggregate Root)
 * Representa o planejamento estratégico da organização
 * 
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'REVIEWING' | 'ARCHIVED';

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
  get createdBy(): string { return this.props.createdBy; }

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
}
