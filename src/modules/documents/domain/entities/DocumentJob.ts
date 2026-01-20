/**
 * DocumentJob Entity
 * 
 * Representa um job de processamento de documento.
 * Gerencia ciclo de vida do processamento assíncrono.
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { JobStatus, type JobStatusType } from '../value-objects/JobStatus';
import { JobType, type JobTypeValue } from '../value-objects/JobType';
import { JobCreatedEvent } from '../events/JobCreatedEvent';
import { JobCompletedEvent } from '../events/JobCompletedEvent';

interface DocumentJobProps {
  organizationId: number;
  branchId: number;
  documentId: string;
  jobType: JobType;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lockedAt: Date | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentJobProps {
  organizationId: number;
  branchId: number;
  documentId: string;
  jobType: JobTypeValue;
  payload?: Record<string, unknown> | null;
  scheduledAt?: Date;
  maxAttempts?: number;
}

export class DocumentJob extends AggregateRoot<string> {
  private readonly props: DocumentJobProps;

  private constructor(id: string, props: DocumentJobProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get documentId(): string { return this.props.documentId; }
  get jobType(): JobType { return this.props.jobType; }
  get status(): JobStatus { return this.props.status; }
  get attempts(): number { return this.props.attempts; }
  get maxAttempts(): number { return this.props.maxAttempts; }
  get scheduledAt(): Date { return this.props.scheduledAt; }
  get startedAt(): Date | null { return this.props.startedAt; }
  get completedAt(): Date | null { return this.props.completedAt; }
  get lockedAt(): Date | null { return this.props.lockedAt; }
  get payload(): Record<string, unknown> | null { return this.props.payload; }
  get result(): Record<string, unknown> | null { return this.props.result; }
  get lastError(): string | null { return this.props.lastError; }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateDocumentJobProps): Result<DocumentJob, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.documentId?.trim()) {
      return Result.fail('documentId é obrigatório');
    }

    // Parse JobType
    const jobTypeResult = JobType.create(props.jobType);
    if (Result.isFail(jobTypeResult)) {
      return Result.fail(jobTypeResult.error);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const maxAttempts = Math.max(1, Math.min(20, props.maxAttempts ?? 5));

    const job = new DocumentJob(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      documentId: props.documentId.trim(),
      jobType: jobTypeResult.value,
      status: JobStatus.queued(),
      attempts: 0,
      maxAttempts,
      scheduledAt: props.scheduledAt ?? now,
      startedAt: null,
      completedAt: null,
      lockedAt: null,
      payload: props.payload ?? null,
      result: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }, now);

    // Emit domain event
    job.addDomainEvent(new JobCreatedEvent(
      id,
      props.organizationId,
      props.documentId,
      props.jobType,
    ));

    return Result.ok(job);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: DocumentJobProps & { id: string }): Result<DocumentJob, string> {
    return Result.ok(new DocumentJob(props.id, props, props.createdAt));
  }

  /**
   * Inicia execução do job (claim)
   */
  startExecution(): Result<void, string> {
    if (!this.props.status.canTransitionTo('RUNNING')) {
      return Result.fail(`Não é possível iniciar job com status ${this.props.status.value}`);
    }

    (this.props as { status: JobStatus }).status = JobStatus.running();
    (this.props as { startedAt: Date | null }).startedAt = new Date();
    (this.props as { lockedAt: Date | null }).lockedAt = new Date();
    (this.props as { attempts: number }).attempts += 1;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Marca job como sucesso
   */
  markAsSucceeded(result?: Record<string, unknown>): Result<void, string> {
    if (!this.props.status.canTransitionTo('SUCCEEDED')) {
      return Result.fail(`Não é possível marcar como sucesso job com status ${this.props.status.value}`);
    }

    (this.props as { status: JobStatus }).status = JobStatus.succeeded();
    (this.props as { completedAt: Date | null }).completedAt = new Date();
    (this.props as { lockedAt: Date | null }).lockedAt = null;
    (this.props as { result: Record<string, unknown> | null }).result = result ?? null;
    this.touch();

    this.addDomainEvent(new JobCompletedEvent(
      this.id,
      this.props.organizationId,
      this.props.documentId,
      'SUCCEEDED',
    ));

    return Result.ok(undefined);
  }

  /**
   * Marca job como falha
   */
  markAsFailed(error: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('FAILED')) {
      return Result.fail(`Não é possível marcar como falha job com status ${this.props.status.value}`);
    }

    const shouldRetry = this.props.attempts < this.props.maxAttempts;

    if (shouldRetry) {
      // Volta para QUEUED para retry
      (this.props as { status: JobStatus }).status = JobStatus.queued();
    } else {
      // Falha definitiva
      (this.props as { status: JobStatus }).status = JobStatus.failed();
      (this.props as { completedAt: Date | null }).completedAt = new Date();

      this.addDomainEvent(new JobCompletedEvent(
        this.id,
        this.props.organizationId,
        this.props.documentId,
        'FAILED',
        error,
      ));
    }

    (this.props as { lockedAt: Date | null }).lockedAt = null;
    (this.props as { lastError: string | null }).lastError = error;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Reprocessa job (coloca de volta na fila)
   */
  requeue(): Result<void, string> {
    if (this.props.status.value !== 'FAILED') {
      return Result.fail('Apenas jobs com status FAILED podem ser reprocessados');
    }

    if (this.props.attempts >= this.props.maxAttempts) {
      return Result.fail('Job atingiu máximo de tentativas');
    }

    (this.props as { status: JobStatus }).status = JobStatus.queued();
    (this.props as { scheduledAt: Date }).scheduledAt = new Date();
    (this.props as { startedAt: Date | null }).startedAt = null;
    (this.props as { completedAt: Date | null }).completedAt = null;
    (this.props as { lockedAt: Date | null }).lockedAt = null;
    (this.props as { lastError: string | null }).lastError = null;
    (this.props as { result: Record<string, unknown> | null }).result = null;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Verifica se lock expirou (5 minutos)
   */
  isLockExpired(lockTimeoutMs: number = 5 * 60 * 1000): boolean {
    if (!this.props.lockedAt) return false;
    
    const now = new Date();
    const lockExpiry = new Date(this.props.lockedAt.getTime() + lockTimeoutMs);
    return now > lockExpiry;
  }

  /**
   * Verifica se pode ser executado
   */
  canBeExecuted(): boolean {
    return (
      this.props.status.isQueued &&
      this.props.scheduledAt <= new Date() &&
      this.props.attempts < this.props.maxAttempts
    );
  }
}
