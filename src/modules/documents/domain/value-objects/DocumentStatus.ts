/**
 * DocumentStatus - Value Object para status de documento
 * 
 * Estados possíveis de um documento no ciclo de vida
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['UPLOADED', 'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED'] as const;
export type DocumentStatusType = typeof VALID_STATUSES[number];

interface DocumentStatusProps extends Record<string, unknown> {
  value: DocumentStatusType;
}

export class DocumentStatus extends ValueObject<DocumentStatusProps> {
  private constructor(props: DocumentStatusProps) {
    super(props);
  }

  get value(): DocumentStatusType { return this.props.value; }

  get isUploaded(): boolean { return this.props.value === 'UPLOADED'; }
  get isQueued(): boolean { return this.props.value === 'QUEUED'; }
  get isProcessing(): boolean { return this.props.value === 'PROCESSING'; }
  get isSucceeded(): boolean { return this.props.value === 'SUCCEEDED'; }
  get isFailed(): boolean { return this.props.value === 'FAILED'; }
  get isTerminal(): boolean { return this.isSucceeded || this.isFailed; }

  static create(status: string): Result<DocumentStatus, string> {
    const trimmed = status.trim().toUpperCase() as DocumentStatusType;
    
    if (!VALID_STATUSES.includes(trimmed)) {
      return Result.fail(`DocumentStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new DocumentStatus({ value: trimmed }));
  }

  static uploaded(): DocumentStatus {
    return new DocumentStatus({ value: 'UPLOADED' });
  }

  static queued(): DocumentStatus {
    return new DocumentStatus({ value: 'QUEUED' });
  }

  static processing(): DocumentStatus {
    return new DocumentStatus({ value: 'PROCESSING' });
  }

  static succeeded(): DocumentStatus {
    return new DocumentStatus({ value: 'SUCCEEDED' });
  }

  static failed(): DocumentStatus {
    return new DocumentStatus({ value: 'FAILED' });
  }

  /**
   * Verifica se pode transicionar para outro status
   */
  canTransitionTo(target: DocumentStatusType): boolean {
    const transitions: Record<DocumentStatusType, DocumentStatusType[]> = {
      'UPLOADED': ['QUEUED', 'PROCESSING', 'FAILED'],
      'QUEUED': ['PROCESSING', 'FAILED'],
      'PROCESSING': ['SUCCEEDED', 'FAILED'],
      'SUCCEEDED': [],
      'FAILED': ['QUEUED'], // Para reprocessamento
    };

    return transitions[this.props.value].includes(target);
  }

  toString(): string {
    return this.props.value;
  }
}
