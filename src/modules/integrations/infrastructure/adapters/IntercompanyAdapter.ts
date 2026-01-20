/**
 * IntercompanyAdapter
 * @see E9 Fase 2: Wrapper do @/services/intercompany-allocation-engine
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IIntercompanyGateway,
  IntercompanyReverseParams,
  IntercompanyReverseResult,
} from '../../domain/ports/output/IIntercompanyGateway';

// TODO (E10): Migrar lógica para Domain Service
import { IntercompanyAllocationEngine } from '@/services/intercompany-allocation-engine';

@injectable()
export class IntercompanyAdapter implements IIntercompanyGateway {
  async reverseAllocation(params: IntercompanyReverseParams): Promise<Result<IntercompanyReverseResult, string>> {
    try {
      await IntercompanyAllocationEngine.reverseAllocation(params.allocationId);
      return Result.ok({
        success: true,
        allocationId: params.allocationId,
        reversedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no Intercompany: ${message}`);
    }
  }
}
