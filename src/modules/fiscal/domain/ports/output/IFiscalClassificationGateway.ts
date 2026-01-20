/**
 * Gateway para classificação fiscal de documentos
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface ClassificationParams {
  organizationId: number;
  branchId: number;
  nfeData: Record<string, unknown>;
}

export interface ClassificationResult {
  classification: string;
  fiscalStatus: string;
  cfop: string;
  icmsType: string;
}

export interface IFiscalClassificationGateway {
  classifyNfe(params: ClassificationParams): Promise<Result<ClassificationResult, string>>;
}
