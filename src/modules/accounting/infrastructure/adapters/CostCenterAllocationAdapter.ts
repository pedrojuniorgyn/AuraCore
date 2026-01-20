/**
 * Adapter para cost-center-allocation legado
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  ICostCenterAllocationGateway, 
  CostCenterAllocationParams,
  AllocationResult,
} from '../../domain/ports/output/ICostCenterAllocationGateway';

// Import legado
import { createCostCenterAllocations } from '@/services/cost-center-allocation';

@injectable()
export class CostCenterAllocationAdapter implements ICostCenterAllocationGateway {
  async createAllocations(params: CostCenterAllocationParams): Promise<Result<AllocationResult, string>> {
    try {
      // Transformar para formato esperado pelo serviço legado
      const legacyInput = {
        journalEntryLineId: params.allocations[0]?.documentId || 0,
        allocations: params.allocations.map(a => ({
          costCenterId: a.costCenterId,
          percentage: a.percentage,
        })),
        createdBy: 'system',
      };
      const result = await createCostCenterAllocations(legacyInput);
      return Result.ok({
        success: result.success,
        allocatedCount: params.allocations.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na alocação: ${message}`);
    }
  }
}
