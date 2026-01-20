/**
 * Adapter para boleto-generator legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IBoletoGateway, 
  BoletoGenerationParams,
  BoletoResult,
} from '../../domain/ports/output/IBoletoGateway';

// Import legado
import { boletoGenerator } from '@/services/financial/boleto-generator';

@injectable()
export class BoletoAdapter implements IBoletoGateway {
  async generate(params: BoletoGenerationParams): Promise<Result<BoletoResult, string>> {
    try {
      const result = await boletoGenerator.gerarBoleto({
        customerId: params.customerId,
        customerName: params.customerName,
        customerCnpj: params.customerCnpj,
        dueDate: params.dueDate,
        value: params.value,
        invoiceNumber: params.invoiceNumber,
        description: params.description,
      });
      if (!result.success) {
        return Result.fail(result.error || 'Erro ao gerar boleto');
      }
      return Result.ok({
        boletoNumber: result.barcodeNumber || '',
        barcode: result.barcodeNumber || '',
        digitableLine: result.linhaDigitavel || '',
        pdfUrl: result.pdfUrl,
        pixKey: result.pixKey,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na geração de boleto: ${message}`);
    }
  }
}
