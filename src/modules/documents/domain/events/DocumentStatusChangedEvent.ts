/**
 * DocumentStatusChangedEvent - Domain Event
 * 
 * Emitido quando o status de um documento muda.
 */
import { BaseDomainEvent } from '@/shared/domain';
import type { DocumentStatusType } from '../value-objects/DocumentStatus';

export class DocumentStatusChangedEvent extends BaseDomainEvent {
  constructor(
    documentId: string,
    public readonly organizationId: number,
    public readonly previousStatus: DocumentStatusType,
    public readonly newStatus: DocumentStatusType,
  ) {
    super(
      documentId,
      'Document',
      'DocumentStatusChangedEvent',
      { organizationId, previousStatus, newStatus }
    );
  }
}
