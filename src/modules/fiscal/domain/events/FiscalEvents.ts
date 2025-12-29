import { BaseDomainEvent } from '@/shared/domain';

export class FiscalDocumentCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      documentType: string;
      series: string;
      number: string;
    }
  ) {
    super(aggregateId, 'FiscalDocument', 'FiscalDocumentCreated', payload);
  }
}

export class FiscalDocumentSubmittedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      documentType: string;
      number: string;
      series: string;
    }
  ) {
    super(aggregateId, 'FiscalDocument', 'FiscalDocumentSubmitted', payload);
  }
}

export class FiscalDocumentAuthorizedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      fiscalKey: string;
      protocolNumber: string;
    }
  ) {
    super(aggregateId, 'FiscalDocument', 'FiscalDocumentAuthorized', payload);
  }
}

export class FiscalDocumentCancelledEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      reason: string;
      protocolNumber: string;
    }
  ) {
    super(aggregateId, 'FiscalDocument', 'FiscalDocumentCancelled', payload);
  }
}

export class FiscalDocumentRejectedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      rejectionCode: string;
      rejectionReason: string;
    }
  ) {
    super(aggregateId, 'FiscalDocument', 'FiscalDocumentRejected', payload);
  }
}

