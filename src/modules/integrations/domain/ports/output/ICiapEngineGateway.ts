/**
 * ICiapEngineGateway - Output Port
 *
 * Interface para geração de bloco G SPED (CIAP).
 * Wrapa o serviço legado ciap-engine.ts
 *
 * @module integrations/domain/ports/output
 * @see E9 Fase 2: Migração de @/services/ciap-engine
 */

import { Result } from '@/shared/domain';

export interface CiapSpedBlockGParams {
  organizationId: number;
  branchId: number;
  period: string; // YYYY-MM
}

export interface CiapSpedBlockGResult {
  lines: string[];
}

export interface ICiapEngineGateway {
  generateSpedBlockG(params: CiapSpedBlockGParams): Promise<Result<CiapSpedBlockGResult, string>>;
}
