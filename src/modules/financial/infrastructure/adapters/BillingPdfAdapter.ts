/**
 * BillingPdfAdapter
 *
 * Implementa IBillingPdfGateway usando o serviço legado.
 * Wrapper temporário até migração completa da lógica para Domain Service.
 *
 * @module financial/infrastructure/adapters
 * @see E9 Fase 2: Wrapper do @/services/financial/billing-pdf-generator
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IBillingPdfGateway,
  BillingPdfParams,
} from '../../domain/ports/output/IBillingPdfGateway';

// TODO (E10): Migrar lógica para Domain Service
import { billingPDFGenerator } from '@/services/financial/billing-pdf-generator';

@injectable()
export class BillingPdfAdapter implements IBillingPdfGateway {
  
  async generatePdf(params: BillingPdfParams): Promise<Result<Buffer, string>> {
    try {
      const pdfBuffer = await billingPDFGenerator.gerarPDF(params.billingId);
      return Result.ok(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar PDF: ${message}`);
    }
  }
}
