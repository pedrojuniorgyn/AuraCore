import { BaseDomainEvent } from '@/shared/domain';

/**
 * Evento: Lançamento criado
 */
export class JournalEntryCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      entryNumber: string;
      source: string;
      description: string;
    }
  ) {
    super(aggregateId, 'JournalEntry', 'JournalEntryCreated', payload);
  }
}

/**
 * Evento: Lançamento postado
 */
export class JournalEntryPostedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      entryNumber: string;
      totalDebit: number;
      totalCredit: number;
      lineCount: number;
      postedBy: string;
    }
  ) {
    super(aggregateId, 'JournalEntry', 'JournalEntryPosted', payload);
  }
}

/**
 * Evento: Lançamento estornado
 */
export class JournalEntryReversedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      entryNumber: string;
      reversedById: string;
    }
  ) {
    super(aggregateId, 'JournalEntry', 'JournalEntryReversed', payload);
  }
}

/**
 * Evento: Período fechado
 */
export class AccountingPeriodClosedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    payload: {
      year: number;
      month: number;
      closedBy: string;
    }
  ) {
    super(aggregateId, 'AccountingPeriod', 'AccountingPeriodClosed', payload);
  }
}

