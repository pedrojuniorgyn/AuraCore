/**
 * Gateway para alocação de centros de custo
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface CostCenterAllocationParams {
  organizationId: number;
  branchId: number;
  allocations: Array<{
    costCenterId: number;
    percentage: number;
    documentId: number;
    documentType: string;
  }>;
}

export interface AllocationResult {
  success: boolean;
  allocatedCount: number;
}

export interface ICostCenterAllocationGateway {
  createAllocations(params: CostCenterAllocationParams): Promise<Result<AllocationResult, string>>;
}
