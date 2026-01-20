/**
 * JobStatus - Value Object para status de job
 * 
 * Estados possíveis de um job de processamento de documento
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type JobStatusType = typeof VALID_STATUSES[number];

interface JobStatusProps extends Record<string, unknown> {
  value: JobStatusType;
}

export class JobStatus extends ValueObject<JobStatusProps> {
  private constructor(props: JobStatusProps) {
    super(props);
  }

  get value(): JobStatusType { return this.props.value; }

  get isQueued(): boolean { return this.props.value === 'QUEUED'; }
  get isRunning(): boolean { return this.props.value === 'RUNNING'; }
  get isSucceeded(): boolean { return this.props.value === 'SUCCEEDED'; }
  get isFailed(): boolean { return this.props.value === 'FAILED'; }
  get isTerminal(): boolean { return this.isSucceeded || this.isFailed; }

  static create(status: string): Result<JobStatus, string> {
    const trimmed = status.trim().toUpperCase() as JobStatusType;
    
    if (!VALID_STATUSES.includes(trimmed)) {
      return Result.fail(`JobStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new JobStatus({ value: trimmed }));
  }

  static queued(): JobStatus {
    return new JobStatus({ value: 'QUEUED' });
  }

  static running(): JobStatus {
    return new JobStatus({ value: 'RUNNING' });
  }

  static succeeded(): JobStatus {
    return new JobStatus({ value: 'SUCCEEDED' });
  }

  static failed(): JobStatus {
    return new JobStatus({ value: 'FAILED' });
  }

  /**
   * Verifica se pode transicionar para outro status
   */
  canTransitionTo(target: JobStatusType): boolean {
    const transitions: Record<JobStatusType, JobStatusType[]> = {
      'QUEUED': ['RUNNING', 'FAILED'],
      'RUNNING': ['SUCCEEDED', 'FAILED', 'QUEUED'], // QUEUED para retry
      'SUCCEEDED': [],
      'FAILED': ['QUEUED'], // Para reprocessamento
    };

    return transitions[this.props.value].includes(target);
  }

  toString(): string {
    return this.props.value;
  }
}
