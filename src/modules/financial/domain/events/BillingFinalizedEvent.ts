import { BaseDomainEvent } from '@/shared/domain';

/**
 * BillingFinalizedEvent
 * 
 * Emitido quando uma fatura de billing é finalizada e gera título no contas a receber.
 * Consumido pelo FinancialAccountingIntegration para gerar lançamentos contábeis.
 * 
 * Inclui dados de retenções para lançamentos separados.
 * 
 * @see F1.5: FinalizeBillingInvoiceUseCase
 * @see F1.2: FinancialAccountingIntegration.onBillingFinalized
 */

export interface BillingFinalizedPayload {
  invoiceId: string;
  receivableId: string;
  organizationId: number;
  branchId: number;
  customerId: number;
  grossAmount: number;
  netAmount: number;
  currency: string;
  totalCtes: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  withholdings: {
    irrf: number;
    pis: number;
    cofins: number;
    csll: number;
    iss: number;
    inss: number;
    total: number;
  };
}

export class BillingFinalizedEvent extends BaseDomainEvent {
  constructor(
    invoiceId: string,
    payload: BillingFinalizedPayload
  ) {
    super(invoiceId, 'BillingInvoice', 'BillingFinalized', payload as unknown as Record<string, unknown>);
  }
}
