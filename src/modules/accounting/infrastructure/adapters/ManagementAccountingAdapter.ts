/**
 * ManagementAccountingAdapter
 *
 * Implementa IManagementAccountingGateway usando o serviço legado.
 * Wrapper temporário até migração completa da lógica para Domain Service.
 *
 * @module accounting/infrastructure/adapters
 * @see E9 Fase 1: Wrapper do @/services/management-accounting
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IManagementAccountingGateway,
  DRECalculationParams,
  DREResult,
  AllocationParams,
  AllocationResult,
} from '../../domain/ports/output/IManagementAccountingGateway';

// TODO (E9.2): Migrar lógica para Domain Service
import {
  calculateManagementDRE as legacyCalculateDRE,
  allocateIndirectCosts as legacyAllocate,
} from '@/services/management-accounting';

@injectable()
export class ManagementAccountingAdapter implements IManagementAccountingGateway {
  
  async calculateDRE(params: DRECalculationParams): Promise<Result<DREResult, string>> {
    try {
      const result = await legacyCalculateDRE(
        params.period,
        params.organizationId,
        params.branchId,
        params.serviceType
      );

      // O serviço legado já retorna a estrutura correta
      return Result.ok(result as unknown as DREResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao calcular DRE: ${message}`);
    }
  }

  async allocateIndirectCosts(params: AllocationParams): Promise<Result<AllocationResult, string>> {
    try {
      const result = await legacyAllocate(
        params.period,
        params.organizationId
      );

      return Result.ok({
        allocated: result.allocated,
        totalAmount: result.totalAmount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao alocar custos: ${message}`);
    }
  }
}
