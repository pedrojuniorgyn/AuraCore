/**
 * Document Entity - Aggregate Root
 * 
 * Representa um documento armazenado no sistema.
 * Gerencia metadados e ciclo de vida do documento.
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { StoragePath } from '../value-objects/StoragePath';
import { DocumentStatus, type DocumentStatusType } from '../value-objects/DocumentStatus';
import { DocumentUploadedEvent } from '../events/DocumentUploadedEvent';
import { DocumentStatusChangedEvent } from '../events/DocumentStatusChangedEvent';

interface DocumentProps {
  organizationId: number;
  branchId: number;
  docType: string;
  entityTable: string | null;
  entityId: number | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string | null;
  storagePath: StoragePath;
  status: DocumentStatus;
  metadata: Record<string, unknown> | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateDocumentProps {
  organizationId: number;
  branchId: number;
  docType: string;
  entityTable?: string | null;
  entityId?: number | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256?: string | null;
  storagePath: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export class Document extends AggregateRoot<string> {
  private readonly props: DocumentProps;

  private constructor(id: string, props: DocumentProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get docType(): string { return this.props.docType; }
  get entityTable(): string | null { return this.props.entityTable; }
  get entityId(): number | null { return this.props.entityId; }
  get fileName(): string { return this.props.fileName; }
  get mimeType(): string { return this.props.mimeType; }
  get fileSize(): number { return this.props.fileSize; }
  get sha256(): string | null { return this.props.sha256; }
  get storagePath(): StoragePath { return this.props.storagePath; }
  get status(): DocumentStatus { return this.props.status; }
  get metadata(): Record<string, unknown> | null { return this.props.metadata; }
  get lastError(): string | null { return this.props.lastError; }
  get createdBy(): string | null { return this.props.createdBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateDocumentProps): Result<Document, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.docType?.trim()) {
      return Result.fail('docType é obrigatório');
    }
    if (!props.fileName?.trim()) {
      return Result.fail('fileName é obrigatório');
    }
    if (!props.mimeType?.trim()) {
      return Result.fail('mimeType é obrigatório');
    }
    if (props.fileSize <= 0) {
      return Result.fail('fileSize deve ser maior que 0');
    }
    if (!props.storagePath?.trim()) {
      return Result.fail('storagePath é obrigatório');
    }

    // Parse StoragePath
    const storagePathResult = StoragePath.create(props.storagePath);
    if (Result.isFail(storagePathResult)) {
      return Result.fail(storagePathResult.error);
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const document = new Document(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      docType: props.docType.trim(),
      entityTable: props.entityTable ?? null,
      entityId: props.entityId ?? null,
      fileName: props.fileName.trim(),
      mimeType: props.mimeType.trim(),
      fileSize: props.fileSize,
      sha256: props.sha256 ?? null,
      storagePath: storagePathResult.value,
      status: DocumentStatus.uploaded(),
      metadata: props.metadata ?? null,
      lastError: null,
      createdBy: props.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }, now);

    // Emit domain event
    document.addDomainEvent(new DocumentUploadedEvent(
      id,
      props.organizationId,
      props.branchId,
      props.docType,
      props.fileName,
    ));

    return Result.ok(document);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: DocumentProps & { id: string }): Result<Document, string> {
    return Result.ok(new Document(props.id, props, props.createdAt));
  }

  /**
   * Atualiza o status do documento
   */
  updateStatus(newStatus: DocumentStatusType, error?: string): Result<void, string> {
    const statusResult = DocumentStatus.create(newStatus);
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    const targetStatus = statusResult.value;
    if (!this.props.status.canTransitionTo(targetStatus.value)) {
      return Result.fail(
        `Não é possível transicionar de ${this.props.status.value} para ${newStatus}`
      );
    }

    const oldStatus = this.props.status.value;
    (this.props as { status: DocumentStatus }).status = targetStatus;
    (this.props as { lastError: string | null }).lastError = error ?? null;
    this.touch();

    this.addDomainEvent(new DocumentStatusChangedEvent(
      this.id,
      this.props.organizationId,
      oldStatus,
      newStatus,
    ));

    return Result.ok(undefined);
  }

  /**
   * Associa documento a uma entidade
   */
  associateWithEntity(entityTable: string, entityId: number): Result<void, string> {
    if (!entityTable?.trim()) {
      return Result.fail('entityTable é obrigatório');
    }
    if (!entityId || entityId <= 0) {
      return Result.fail('entityId deve ser maior que 0');
    }

    (this.props as { entityTable: string | null }).entityTable = entityTable.trim();
    (this.props as { entityId: number | null }).entityId = entityId;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Soft delete
   */
  softDelete(): Result<void, string> {
    if (this.props.deletedAt) {
      return Result.fail('Documento já foi deletado');
    }

    (this.props as { deletedAt: Date | null }).deletedAt = new Date();
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Atualiza metadata
   */
  updateMetadata(metadata: Record<string, unknown>): Result<void, string> {
    (this.props as { metadata: Record<string, unknown> | null }).metadata = metadata;
    this.touch();

    return Result.ok(undefined);
  }
}
