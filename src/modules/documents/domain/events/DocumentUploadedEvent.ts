/**
 * DocumentUploadedEvent - Domain Event
 * 
 * Emitido quando um novo documento é carregado no sistema.
 */
import { BaseDomainEvent } from '@/shared/domain';

export class DocumentUploadedEvent extends BaseDomainEvent {
  constructor(
    documentId: string,
    public readonly organizationId: number,
    public readonly branchId: number,
    public readonly docType: string,
    public readonly fileName: string,
  ) {
    super(
      documentId,
      'Document',
      'DocumentUploadedEvent',
      { organizationId, branchId, docType, fileName }
    );
  }
}
