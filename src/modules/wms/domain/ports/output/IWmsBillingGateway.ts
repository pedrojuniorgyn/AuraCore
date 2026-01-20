/**
 * IWmsBillingGateway - Output Port
 *
 * Interface para operações de faturamento WMS.
 * Wrapa o serviço legado wms-billing-engine.ts
 *
 * @module wms/domain/ports/output
 * @see ARCH-011: Gateways implementam Output Ports
 * @see E9 Fase 2: Migração de @/services/wms-billing-engine
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface PreInvoiceApprovalParams {
  preInvoiceId: number;
  organizationId: number;
  branchId: number;
}

export interface IssueNfseParams {
  preInvoiceId: number;
  invoiceNumber: string;
  organizationId: number;
  branchId: number;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Gateway para operações de faturamento WMS.
 *
 * Implementação em infrastructure/adapters/WmsBillingAdapter.ts
 */
export interface IWmsBillingGateway {
  /**
   * Envia pré-fatura para aprovação do cliente
   */
  sendForApproval(params: PreInvoiceApprovalParams): Promise<Result<void, string>>;
  
  /**
   * Emite NFS-e para uma pré-fatura aprovada
   */
  issueNfse(params: IssueNfseParams): Promise<Result<void, string>>;
}
