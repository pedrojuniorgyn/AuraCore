/**
 * IBillingPdfGateway - Output Port
 *
 * Interface para geração de PDF de faturas.
 * Wrapa o serviço legado billing-pdf-generator.ts
 *
 * @module financial/domain/ports/output
 * @see ARCH-011: Gateways implementam Output Ports
 * @see E9 Fase 2: Migração de @/services/financial/billing-pdf-generator
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface BillingPdfParams {
  billingId: number;
  organizationId: number;
  branchId: number;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Gateway para geração de PDF de faturas.
 *
 * Implementação em infrastructure/adapters/BillingPdfAdapter.ts
 */
export interface IBillingPdfGateway {
  /**
   * Gera PDF da fatura
   */
  generatePdf(params: BillingPdfParams): Promise<Result<Buffer, string>>;
}
