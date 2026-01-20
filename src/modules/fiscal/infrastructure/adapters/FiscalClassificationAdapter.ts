/**
 * Adapter para fiscal-classification-service legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IFiscalClassificationGateway, 
  ClassificationParams,
  ClassificationResult,
} from '../../domain/ports/output/IFiscalClassificationGateway';

// Import legado
import { classifyNFe, getFiscalStatusFromClassification } from '@/services/fiscal-classification-service';

@injectable()
export class FiscalClassificationAdapter implements IFiscalClassificationGateway {
  async classifyNfe(params: ClassificationParams): Promise<Result<ClassificationResult, string>> {
    try {
      // O serviço legado espera (nfe: ParsedNFe, branchCNPJ: string)
      // nfeData deve conter branchCNPJ ou buscar de outro lugar
      const branchCNPJ = (params.nfeData as Record<string, unknown>).branchCNPJ as string || '';
      const classification = classifyNFe(
        params.nfeData as unknown as Parameters<typeof classifyNFe>[0],
        branchCNPJ
      );
      const fiscalStatus = getFiscalStatusFromClassification(classification);
      
      return Result.ok({
        classification, // É uma string (union type)
        fiscalStatus,
        cfop: '',
        icmsType: '',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na classificação: ${message}`);
    }
  }
}
