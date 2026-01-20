/**
 * Gateway para geração de PDF de propostas comerciais
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface ProposalPdfParams {
  proposalId: number;
  organizationId: number;
  branchId: number;
}

export interface IProposalPdfGateway {
  generatePdf(params: ProposalPdfParams): Promise<Result<Buffer, string>>;
}
