/**
 * IClaimsEngineGateway - Output Port
 *
 * Interface para workflow de sinistros.
 * Wrapa o serviço legado claims-workflow-engine.ts
 *
 * @module integrations/domain/ports/output
 * @see E9 Fase 2: Migração de @/services/claims-workflow-engine
 */

import { Result } from '@/shared/domain';

export interface ClaimDecisionParams {
  claimId: number;
  decision: string;
  amount?: number;
  notes?: string;
  organizationId: number;
  branchId: number;
}

export interface ClaimDecisionResult {
  success: boolean;
  claimId: number;
  newStatus: string;
}

export interface IClaimsEngineGateway {
  decide(params: ClaimDecisionParams): Promise<Result<ClaimDecisionResult, string>>;
}
