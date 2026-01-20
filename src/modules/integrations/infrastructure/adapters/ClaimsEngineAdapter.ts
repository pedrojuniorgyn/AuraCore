/**
 * ClaimsEngineAdapter
 * @see E9 Fase 2: Wrapper do @/services/claims-workflow-engine
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IClaimsEngineGateway,
  ClaimDecisionParams,
  ClaimDecisionResult,
} from '../../domain/ports/output/IClaimsEngineGateway';

// TODO (E10): Migrar lógica para Domain Service
import { ClaimsWorkflowEngine } from '@/services/claims-workflow-engine';

@injectable()
export class ClaimsEngineAdapter implements IClaimsEngineGateway {
  async decide(params: ClaimDecisionParams): Promise<Result<ClaimDecisionResult, string>> {
    try {
      await ClaimsWorkflowEngine.decideAction(params.claimId, {
        decision: params.decision as 'FRANCHISE' | 'INSURANCE' | 'THIRD_PARTY',
        amount: params.amount || 0,
        notes: params.notes,
      });
      return Result.ok({ success: true } as ClaimDecisionResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no Claims: ${message}`);
    }
  }
}
