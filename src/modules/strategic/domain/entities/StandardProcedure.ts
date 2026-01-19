/**
 * Entity: StandardProcedure (Padrão)
 * Padronização de procedimentos após resolução bem-sucedida (ACT no PDCA)
 * 
 * @module strategic/domain/entities
 * @see ADR-0020, ADR-0022
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type StandardProcedureStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'OBSOLETE';

interface StandardProcedureProps {
  organizationId: number;
  branchId: number;
  sourceActionPlanId: string | null;
  code: string;
  title: string;
  problemDescription: string;
  rootCause: string | null;
  solution: string;
  standardOperatingProcedure: string | null;
  department: string | null;
  processName: string | null;
  ownerUserId: string;
  version: number;
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
  status: StandardProcedureStatus;
  attachments: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateStandardProcedureProps {
  organizationId: number;
  branchId: number;
  sourceActionPlanId?: string;
  code: string;
  title: string;
  problemDescription: string;
  rootCause?: string;
  solution: string;
  standardOperatingProcedure?: string;
  department?: string;
  processName?: string;
  ownerUserId: string;
  nextReviewDate?: Date;
  createdBy: string;
}

export class StandardProcedure extends AggregateRoot<string> {
  private readonly props: StandardProcedureProps;

  private constructor(id: string, props: StandardProcedureProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get sourceActionPlanId(): string | null { return this.props.sourceActionPlanId; }
  get code(): string { return this.props.code; }
  get title(): string { return this.props.title; }
  get problemDescription(): string { return this.props.problemDescription; }
  get rootCause(): string | null { return this.props.rootCause; }
  get solution(): string { return this.props.solution; }
  get standardOperatingProcedure(): string | null { return this.props.standardOperatingProcedure; }
  get department(): string | null { return this.props.department; }
  get processName(): string | null { return this.props.processName; }
  get ownerUserId(): string { return this.props.ownerUserId; }
  get version(): number { return this.props.version; }
  get lastReviewDate(): Date | null { return this.props.lastReviewDate; }
  get nextReviewDate(): Date | null { return this.props.nextReviewDate; }
  get status(): StandardProcedureStatus { return this.props.status; }
  get attachments(): string[] { return [...this.props.attachments]; }
  get createdBy(): string { return this.props.createdBy; }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateStandardProcedureProps): Result<StandardProcedure, string> {
    // Validações
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (!props.title?.trim()) return Result.fail('title é obrigatório');
    if (!props.problemDescription?.trim()) return Result.fail('problemDescription é obrigatório');
    if (!props.solution?.trim()) return Result.fail('solution é obrigatório');
    if (!props.ownerUserId) return Result.fail('ownerUserId é obrigatório');
    if (!props.createdBy) return Result.fail('createdBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const procedure = new StandardProcedure(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      sourceActionPlanId: props.sourceActionPlanId ?? null,
      code: props.code.trim().toUpperCase(),
      title: props.title.trim(),
      problemDescription: props.problemDescription.trim(),
      rootCause: props.rootCause?.trim() ?? null,
      solution: props.solution.trim(),
      standardOperatingProcedure: props.standardOperatingProcedure?.trim() ?? null,
      department: props.department?.trim() ?? null,
      processName: props.processName?.trim() ?? null,
      ownerUserId: props.ownerUserId,
      version: 1,
      lastReviewDate: null,
      nextReviewDate: props.nextReviewDate ?? null,
      status: 'DRAFT',
      attachments: [],
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(procedure);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: StandardProcedureProps & { id: string }): Result<StandardProcedure, string> {
    return Result.ok(new StandardProcedure(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      sourceActionPlanId: props.sourceActionPlanId,
      code: props.code,
      title: props.title,
      problemDescription: props.problemDescription,
      rootCause: props.rootCause,
      solution: props.solution,
      standardOperatingProcedure: props.standardOperatingProcedure,
      department: props.department,
      processName: props.processName,
      ownerUserId: props.ownerUserId,
      version: props.version,
      lastReviewDate: props.lastReviewDate,
      nextReviewDate: props.nextReviewDate,
      status: props.status,
      attachments: props.attachments,
      createdBy: props.createdBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Publica o padrão (DRAFT → ACTIVE)
   */
  publish(): Result<void, string> {
    if (this.props.status !== 'DRAFT' && this.props.status !== 'UNDER_REVIEW') {
      return Result.fail(`Não é possível publicar padrão com status ${this.props.status}`);
    }
    
    (this.props as { status: StandardProcedureStatus }).status = 'ACTIVE';
    (this.props as { lastReviewDate: Date }).lastReviewDate = new Date();
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STANDARD_PROCEDURE_PUBLISHED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'StandardProcedure',
      payload: { procedureId: this.id, code: this.code },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Inicia revisão do padrão
   */
  startReview(): Result<void, string> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail('Apenas padrões ativos podem ser revisados');
    }
    
    (this.props as { status: StandardProcedureStatus }).status = 'UNDER_REVIEW';
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Cria nova versão após revisão
   */
  createNewVersion(updates: {
    solution?: string;
    standardOperatingProcedure?: string;
    rootCause?: string;
    nextReviewDate?: Date;
  }): Result<void, string> {
    if (this.props.status !== 'UNDER_REVIEW') {
      return Result.fail('Padrão deve estar em revisão para criar nova versão');
    }
    
    if (updates.solution) {
      (this.props as { solution: string }).solution = updates.solution.trim();
    }
    if (updates.standardOperatingProcedure !== undefined) {
      (this.props as { standardOperatingProcedure: string | null }).standardOperatingProcedure = 
        updates.standardOperatingProcedure?.trim() ?? null;
    }
    if (updates.rootCause !== undefined) {
      (this.props as { rootCause: string | null }).rootCause = 
        updates.rootCause?.trim() ?? null;
    }
    if (updates.nextReviewDate) {
      (this.props as { nextReviewDate: Date }).nextReviewDate = updates.nextReviewDate;
    }
    
    (this.props as { version: number }).version += 1;
    (this.props as { status: StandardProcedureStatus }).status = 'ACTIVE';
    (this.props as { lastReviewDate: Date }).lastReviewDate = new Date();
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STANDARD_PROCEDURE_VERSION_CREATED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'StandardProcedure',
      payload: { procedureId: this.id, newVersion: this.props.version },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Obsoleta o padrão
   */
  markAsObsolete(): Result<void, string> {
    if (this.props.status === 'OBSOLETE') {
      return Result.fail('Padrão já está obsoleto');
    }
    
    (this.props as { status: StandardProcedureStatus }).status = 'OBSOLETE';
    this.touch();
    
    this.addDomainEvent({
      eventId: globalThis.crypto.randomUUID(),
      eventType: 'STANDARD_PROCEDURE_OBSOLETED',
      occurredAt: new Date(),
      aggregateId: this.id,
      aggregateType: 'StandardProcedure',
      payload: { procedureId: this.id },
    });
    
    return Result.ok(undefined);
  }

  /**
   * Adiciona anexo
   */
  addAttachment(url: string): Result<void, string> {
    if (!url?.trim()) return Result.fail('url é obrigatório');
    
    this.props.attachments.push(url.trim());
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Remove anexo
   */
  removeAttachment(url: string): Result<void, string> {
    const index = this.props.attachments.indexOf(url);
    if (index === -1) {
      return Result.fail('Anexo não encontrado');
    }
    
    this.props.attachments.splice(index, 1);
    this.touch();
    
    return Result.ok(undefined);
  }

  /**
   * Verifica se precisa de revisão
   */
  get needsReview(): boolean {
    if (!this.props.nextReviewDate) return false;
    return new Date() >= this.props.nextReviewDate;
  }
}
