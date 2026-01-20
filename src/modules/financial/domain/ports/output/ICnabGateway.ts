/**
 * Gateway para geração de arquivos CNAB 240
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface CnabGenerationParams {
  organizationId: number;
  branchId: number;
  bankCode: string;
  bankAgency: string;
  bankAccount: string;
  payableIds: number[];
  paymentDate: Date;
}

export interface CnabResult {
  content: string;
  fileName: string;
  totalRecords: number;
  totalValue: number;
}

export interface ICnabGateway {
  generateCnab240(params: CnabGenerationParams): Promise<Result<CnabResult, string>>;
}
