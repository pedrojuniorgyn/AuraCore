/**
 * Adapter para proposal-pdf-generator legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IProposalPdfGateway, 
  ProposalPdfParams,
} from '../../domain/ports/output/IProposalPdfGateway';

// Import legado
import { proposalPdfGenerator } from '@/services/commercial/proposal-pdf-generator';

@injectable()
export class ProposalPdfAdapter implements IProposalPdfGateway {
  async generatePdf(params: ProposalPdfParams): Promise<Result<Buffer, string>> {
    try {
      // O serviço legado espera ProposalData, não apenas ID
      // TODO (E10): Refatorar para buscar dados da proposta aqui ou no Use Case
      const proposalData = {
        proposalNumber: `PROP-${params.proposalId}`,
        companyName: 'Cliente',
        contactName: 'Contato',
        routes: [],
        prices: [],
        conditions: {},
        validityDays: 15,
      };
      const buffer = await proposalPdfGenerator.generateProposalPdf(proposalData);
      return Result.ok(buffer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na geração de PDF: ${message}`);
    }
  }
}
