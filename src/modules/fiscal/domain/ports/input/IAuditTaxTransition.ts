/**
 * IAuditTaxTransition - Input Port (ARCH-010)
 * 
 * Registra auditoria da transição tributária (regime atual vs reforma 2026).
 * Usado para compliance e rastreabilidade das diferenças de cálculo.
 */
import { Result } from '@/shared/domain';
import type { AuditTaxTransitionInput, AuditTaxTransitionOutput } from '../../../application/dtos/AuditTaxTransitionDto';

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface IAuditTaxTransition {
  execute(
    input: AuditTaxTransitionInput,
    ctx: ExecutionContext
  ): Promise<Result<AuditTaxTransitionOutput, string>>;
}
