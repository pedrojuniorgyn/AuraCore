/**
 * JobCompletedEvent - Domain Event
 * 
 * Emitido quando um job de processamento é concluído (sucesso ou falha).
 */
import { BaseDomainEvent } from '@/shared/domain';

export class JobCompletedEvent extends BaseDomainEvent {
  constructor(
    jobId: string,
    public readonly organizationId: number,
    public readonly documentId: string,
    public readonly outcome: 'SUCCEEDED' | 'FAILED',
    public readonly error?: string,
  ) {
    super(
      jobId,
      'DocumentJob',
      'JobCompletedEvent',
      { organizationId, documentId, outcome, error }
    );
  }
}
