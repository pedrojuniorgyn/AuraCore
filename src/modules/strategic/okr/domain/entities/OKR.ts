/**
 * Entity: OKR (Aggregate Root)
 * Representa um Objetivo e Resultados-Chave
 * 
 * @module strategic/okr/domain/entities
 */
import { AggregateRoot } from '../../../../../shared/domain/entities/AggregateRoot';
import { Result } from '../../../../../shared/domain/types/Result';
import { KeyResult } from './KeyResult';

export type OKRLevel = 'corporate' | 'department' | 'team' | 'individual';
export type OKRStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type OKRPeriodType = 'quarter' | 'semester' | 'year' | 'custom';

interface OKRProps {
  // Identification
  title: string;
  description?: string;

  // Hierarchy
  level: OKRLevel;
  parentId?: string;

  // Period
  periodType: OKRPeriodType;
  periodLabel: string;
  startDate: Date;
  endDate: Date;

  // Owner
  ownerId: string;
  ownerName: string;
  ownerType: 'user' | 'team' | 'department';

  // Key Results
  keyResults: KeyResult[];

  // Progress & Status
  progress: number; // 0-100
  status: OKRStatus;

  // Multi-tenancy
  organizationId: number;
  branchId: number;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateOKRProps {
  title: string;
  description?: string;
  level: OKRLevel;
  parentId?: string;
  periodType: OKRPeriodType;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  ownerName: string;
  ownerType: 'user' | 'team' | 'department';
  organizationId: number;
  branchId: number;
  createdBy: string;
}

export class OKR extends AggregateRoot<string> {
  private readonly props: OKRProps;

  private constructor(id: string, props: OKRProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get title(): string { return this.props.title; }
  get description(): string | undefined { return this.props.description; }
  get level(): OKRLevel { return this.props.level; }
  get parentId(): string | undefined { return this.props.parentId; }
  get periodType(): OKRPeriodType { return this.props.periodType; }
  get periodLabel(): string { return this.props.periodLabel; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get ownerId(): string { return this.props.ownerId; }
  get ownerName(): string { return this.props.ownerName; }
  get ownerType(): 'user' | 'team' | 'department' { return this.props.ownerType; }
  get keyResults(): readonly KeyResult[] { return [...this.props.keyResults]; }
  get progress(): number { return this.props.progress; }
  get status(): OKRStatus { return this.props.status; }
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get createdBy(): string { return this.props.createdBy; }

  /**
   * Verifica se OKR está editável
   */
  get isEditable(): boolean {
    return this.props.status === 'draft' || this.props.status === 'active';
  }

  /**
   * Verifica se OKR está atrasado
   */
  get isOverdue(): boolean {
    return new Date() > this.props.endDate && this.props.status !== 'completed';
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateOKRProps): Result<OKR, string> {
    // Validações de domínio
    if (!props.title?.trim()) {
      return Result.fail('OKR title é obrigatório');
    }

    if (props.title.length > 200) {
      return Result.fail('OKR title deve ter no máximo 200 caracteres');
    }

    if (props.description && props.description.length > 1000) {
      return Result.fail('OKR description deve ter no máximo 1000 caracteres');
    }

    if (props.endDate <= props.startDate) {
      return Result.fail('End date deve ser posterior a start date');
    }

    // Validar multi-tenancy
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization ID é obrigatório');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch ID é obrigatório');
    }

    if (!props.ownerId?.trim()) {
      return Result.fail('Owner ID é obrigatório');
    }

    if (!props.ownerName?.trim()) {
      return Result.fail('Owner name é obrigatório');
    }

    if (!props.createdBy?.trim()) {
      return Result.fail('Created by é obrigatório');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const okr = new OKR(
      id,
      {
        title: props.title.trim(),
        description: props.description?.trim(),
        level: props.level,
        parentId: props.parentId,
        periodType: props.periodType,
        periodLabel: props.periodLabel,
        startDate: props.startDate,
        endDate: props.endDate,
        ownerId: props.ownerId,
        ownerName: props.ownerName,
        ownerType: props.ownerType,
        keyResults: [],
        progress: 0,
        status: 'draft',
        organizationId: props.organizationId,
        branchId: props.branchId,
        createdBy: props.createdBy,
        createdAt: now,
        updatedAt: now,
      },
      now
    );

    okr.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'OKR_CREATED',
      occurredAt: now,
      aggregateId: id,
      aggregateType: 'OKR',
      payload: { okrId: id, title: props.title, level: props.level },
    });

    return Result.ok(okr);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: OKRProps & { id: string }): Result<OKR, string> {
    return Result.ok(
      new OKR(
        props.id,
        {
          title: props.title,
          description: props.description,
          level: props.level,
          parentId: props.parentId,
          periodType: props.periodType,
          periodLabel: props.periodLabel,
          startDate: props.startDate,
          endDate: props.endDate,
          ownerId: props.ownerId,
          ownerName: props.ownerName,
          ownerType: props.ownerType,
          keyResults: props.keyResults,
          progress: props.progress,
          status: props.status,
          organizationId: props.organizationId,
          branchId: props.branchId,
          createdBy: props.createdBy,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
        },
        props.createdAt
      )
    );
  }

  // Business Methods

  /**
   * Calcula o progresso baseado nos Key Results
   */
  calculateProgress(): number {
    if (this.props.keyResults.length === 0) {
      return 0;
    }

    // Progresso ponderado pelos pesos dos KRs
    const totalWeight = this.props.keyResults.reduce((sum, kr) => sum + kr.weight, 0);

    if (totalWeight === 0) {
      // Se nenhum peso definido, média simples
      const totalProgress = this.props.keyResults.reduce((sum, kr) => sum + kr.progress, 0);
      return Math.round(totalProgress / this.props.keyResults.length);
    }

    // Progresso ponderado
    const weightedProgress = this.props.keyResults.reduce(
      (sum, kr) => sum + (kr.progress * kr.weight) / 100,
      0
    );

    return Math.round((weightedProgress / totalWeight) * 100);
  }

  /**
   * Atualiza o progresso recalculando dos Key Results
   */
  updateProgress(): void {
    (this.props as { progress: number }).progress = this.calculateProgress();
    this.touch();
  }

  /**
   * Adiciona um Key Result ao OKR
   */
  addKeyResult(keyResult: KeyResult): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail('OKR não está editável');
    }

    if (this.props.keyResults.length >= 5) {
      return Result.fail('OKR não pode ter mais de 5 Key Results');
    }

    (this.props.keyResults as KeyResult[]).push(keyResult);
    this.updateProgress();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'KEY_RESULT_ADDED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, keyResultTitle: keyResult.title },
    });

    return Result.ok(undefined);
  }

  /**
   * Remove um Key Result pelo índice
   */
  removeKeyResult(index: number): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail('OKR não está editável');
    }

    if (index < 0 || index >= this.props.keyResults.length) {
      return Result.fail('Índice de Key Result inválido');
    }

    const removed = this.props.keyResults[index];
    (this.props.keyResults as KeyResult[]).splice(index, 1);
    this.updateProgress();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'KEY_RESULT_REMOVED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, keyResultTitle: removed.title },
    });

    return Result.ok(undefined);
  }

  /**
   * Atualiza um Key Result pelo índice
   */
  updateKeyResult(index: number, keyResult: KeyResult): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail('OKR não está editável');
    }

    if (index < 0 || index >= this.props.keyResults.length) {
      return Result.fail('Índice de Key Result inválido');
    }

    (this.props.keyResults as KeyResult[])[index] = keyResult;
    this.updateProgress();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'KEY_RESULT_UPDATED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, keyResultTitle: keyResult.title },
    });

    return Result.ok(undefined);
  }

  /**
   * Ativa o OKR (DRAFT → ACTIVE)
   */
  activate(): Result<void, string> {
    if (this.props.status !== 'draft') {
      return Result.fail(`Não é possível ativar OKR com status ${this.props.status}`);
    }

    if (this.props.keyResults.length === 0) {
      return Result.fail('OKR deve ter pelo menos 1 Key Result para ser ativado');
    }

    (this.props as { status: OKRStatus }).status = 'active';
    this.touch();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'OKR_ACTIVATED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, title: this.props.title },
    });

    return Result.ok(undefined);
  }

  /**
   * Completa o OKR (ACTIVE → COMPLETED)
   */
  complete(): Result<void, string> {
    if (this.props.status !== 'active') {
      return Result.fail(`Não é possível completar OKR com status ${this.props.status}`);
    }

    (this.props as { status: OKRStatus }).status = 'completed';
    this.touch();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'OKR_COMPLETED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, finalProgress: this.props.progress },
    });

    return Result.ok(undefined);
  }

  /**
   * Cancela o OKR
   */
  cancel(reason?: string): Result<void, string> {
    if (this.props.status === 'completed' || this.props.status === 'cancelled') {
      return Result.fail(`Não é possível cancelar OKR com status ${this.props.status}`);
    }

    (this.props as { status: OKRStatus }).status = 'cancelled';
    this.touch();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'OKR_CANCELLED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id, reason },
    });

    return Result.ok(undefined);
  }

  /**
   * Atualiza detalhes do OKR
   */
  updateDetails(props: {
    title?: string;
    description?: string;
    periodLabel?: string;
    endDate?: Date;
  }): Result<void, string> {
    if (!this.isEditable) {
      return Result.fail('OKR não está editável');
    }

    if (props.title !== undefined) {
      if (!props.title.trim()) {
        return Result.fail('Title não pode ser vazio');
      }
      if (props.title.length > 200) {
        return Result.fail('Title deve ter no máximo 200 caracteres');
      }
      (this.props as { title: string }).title = props.title.trim();
    }

    if (props.description !== undefined) {
      if (props.description.length > 1000) {
        return Result.fail('Description deve ter no máximo 1000 caracteres');
      }
      (this.props as { description: string | undefined }).description = props.description?.trim();
    }

    if (props.periodLabel !== undefined) {
      (this.props as { periodLabel: string }).periodLabel = props.periodLabel;
    }

    if (props.endDate !== undefined) {
      if (props.endDate <= this.props.startDate) {
        return Result.fail('End date deve ser posterior a start date');
      }
      (this.props as { endDate: Date }).endDate = props.endDate;
    }

    this.touch();

    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'OKR_UPDATED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'OKR',
      payload: { okrId: this.id },
    });

    return Result.ok(undefined);
  }
}
