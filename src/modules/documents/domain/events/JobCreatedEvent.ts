/**
 * JobCreatedEvent - Domain Event
 * 
 * Emitido quando um novo job de processamento é criado.
 */
import { BaseDomainEvent } from '@/shared/domain';
import type { JobTypeValue } from '../value-objects/JobType';

export class JobCreatedEvent extends BaseDomainEvent {
  constructor(
    jobId: string,
    public readonly organizationId: number,
    public readonly documentId: string,
    public readonly jobType: JobTypeValue,
  ) {
    super(
      jobId,
      'DocumentJob',
      'JobCreatedEvent',
      { organizationId, documentId, jobType }
    );
  }
}
