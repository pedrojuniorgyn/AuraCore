/**
 * CiapEngineAdapter
 * @see E9 Fase 2: Wrapper do @/services/ciap-engine
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  ICiapEngineGateway,
  CiapSpedBlockGParams,
  CiapSpedBlockGResult,
} from '../../domain/ports/output/ICiapEngineGateway';

// TODO (E10): Migrar lógica para Domain Service
import { CIAPEngine } from '@/services/ciap-engine';

@injectable()
export class CiapEngineAdapter implements ICiapEngineGateway {
  async generateSpedBlockG(params: CiapSpedBlockGParams): Promise<Result<CiapSpedBlockGResult, string>> {
    try {
      const lines = await CIAPEngine.generateSpedBlockG(
        params.organizationId,
        params.period
      );
      return Result.ok({ lines } as CiapSpedBlockGResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no CIAP: ${message}`);
    }
  }
}
