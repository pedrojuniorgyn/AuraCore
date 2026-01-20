/**
 * IManagementAccountingGateway - Output Port
 *
 * Interface para contabilidade gerencial (DRE e alocação de custos).
 * Wrapa o serviço legado management-accounting.ts
 *
 * @module accounting/domain/ports/output
 * @see ARCH-011: Gateways implementam Output Ports
 * @see E9 Fase 1: Migração de @/services/management-accounting
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface DRECalculationParams {
  period: string; // YYYY-MM
  organizationId: bigint;
  branchId?: number;
  serviceType?: string;
}

export interface DRESection {
  name: string;
  accounts: Array<{
    code: string;
    name: string;
    balance: number;
  }>;
  total: number;
}

export interface DREResult {
  grossRevenue: DRESection;
  deductions: DRESection;
  netRevenue: DRESection;
  variableCosts: DRESection;
  marginContribution: DRESection;
  fixedCosts: DRESection;
  operatingResult: DRESection;
  period: string;
  generatedAt: Date;
}

export interface AllocationParams {
  period: string; // YYYY-MM
  organizationId: bigint;
}

export interface AllocationResult {
  allocated: number;
  totalAmount: number;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Gateway para contabilidade gerencial.
 *
 * Implementação em infrastructure/adapters/ManagementAccountingAdapter.ts
 */
export interface IManagementAccountingGateway {
  /**
   * Calcula DRE Gerencial
   */
  calculateDRE(params: DRECalculationParams): Promise<Result<DREResult, string>>;
  
  /**
   * Aloca custos indiretos para um período
   */
  allocateIndirectCosts(params: AllocationParams): Promise<Result<AllocationResult, string>>;
}
