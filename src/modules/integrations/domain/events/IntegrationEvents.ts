/**
 * Integration Events
 * E7.9 Integrações - Semana 1
 * 
 * Domain events para integrações externas
 * Preservam multi-tenancy via organizationId/branchId
 */

import { BaseDomainEvent } from '@/shared/domain';

// SEFAZ Events

export class CteAuthorizedEvent extends BaseDomainEvent {
  constructor(
    cteKey: string,
    protocolNumber: string,
    organizationId: number,
    branchId: number
  ) {
    super(
      cteKey,
      'CTe',
      'CTe.Authorized',
      { cteKey, protocolNumber, organizationId, branchId }
    );
  }
}

export class CteCancelledEvent extends BaseDomainEvent {
  constructor(
    cteKey: string,
    protocolNumber: string,
    organizationId: number,
    branchId: number
  ) {
    super(
      cteKey,
      'CTe',
      'CTe.Cancelled',
      { cteKey, protocolNumber, organizationId, branchId }
    );
  }
}

export class NfeImportedEvent extends BaseDomainEvent {
  constructor(
    nfeKey: string,
    nsu: number,
    organizationId: number,
    branchId: number
  ) {
    super(
      nfeKey,
      'NFe',
      'NFe.Imported',
      { nfeKey, nsu, organizationId, branchId }
    );
  }
}

export class MdfeAuthorizedEvent extends BaseDomainEvent {
  constructor(
    mdfeKey: string,
    protocolNumber: string,
    organizationId: number,
    branchId: number
  ) {
    super(
      mdfeKey,
      'MDFe',
      'MDFe.Authorized',
      { mdfeKey, protocolNumber, organizationId, branchId }
    );
  }
}

export class MdfeClosedEvent extends BaseDomainEvent {
  constructor(
    mdfeKey: string,
    organizationId: number,
    branchId: number
  ) {
    super(
      mdfeKey,
      'MDFe',
      'MDFe.Closed',
      { mdfeKey, organizationId, branchId }
    );
  }
}

// Banking Events

export class BankSlipPaidEvent extends BaseDomainEvent {
  constructor(
    slipId: string,
    amountCents: number,
    paidAt: Date,
    organizationId: number
  ) {
    super(
      slipId,
      'BankSlip',
      'BankSlip.Paid',
      { slipId, amountCents, paidAt, organizationId }
    );
  }
}

export class PixChargeCompletedEvent extends BaseDomainEvent {
  constructor(
    txId: string,
    amountCents: number,
    completedAt: Date,
    organizationId: number
  ) {
    super(
      txId,
      'PixCharge',
      'PixCharge.Completed',
      { txId, amountCents, completedAt, organizationId }
    );
  }
}

export class PaymentExecutedEvent extends BaseDomainEvent {
  constructor(
    paymentId: string,
    type: 'PIX' | 'TED' | 'DOC' | 'BOLETO',
    amountCents: number,
    organizationId: number
  ) {
    super(
      paymentId,
      'Payment',
      'Payment.Executed',
      { paymentId, type, amountCents, organizationId }
    );
  }
}

export class DdaDebitAuthorizedEvent extends BaseDomainEvent {
  constructor(
    debitId: string,
    amountCents: number,
    organizationId: number
  ) {
    super(
      debitId,
      'DdaDebit',
      'DdaDebit.Authorized',
      { debitId, amountCents, organizationId }
    );
  }
}

// Email Events

export class EmailSentEvent extends BaseDomainEvent {
  constructor(
    messageId: string,
    recipients: string[],
    subject: string,
    organizationId: number
  ) {
    super(
      messageId,
      'Email',
      'Email.Sent',
      { messageId, recipients, subject, organizationId }
    );
  }
}

export class EmailFailedEvent extends BaseDomainEvent {
  constructor(
    recipients: string[],
    subject: string,
    errorMessage: string,
    organizationId: number
  ) {
    super(
      `email-fail-${Date.now()}`,
      'Email',
      'Email.Failed',
      { recipients, subject, errorMessage, organizationId }
    );
  }
}

// Bank Statement Events

export class BankStatementParsedEvent extends BaseDomainEvent {
  constructor(
    accountNumber: string,
    bankCode: string,
    transactionCount: number,
    organizationId: number
  ) {
    super(
      `${bankCode}-${accountNumber}`,
      'BankStatement',
      'BankStatement.Parsed',
      { accountNumber, bankCode, transactionCount, organizationId }
    );
  }
}

