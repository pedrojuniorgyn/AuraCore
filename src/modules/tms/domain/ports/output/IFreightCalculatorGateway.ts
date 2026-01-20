/**
 * IFreightCalculatorGateway - Output Port
 *
 * Interface para cálculo de frete.
 * Wrapa o serviço legado freight-calculator.ts
 *
 * @module tms/domain/ports/output
 * @see ARCH-011: Gateways implementam Output Ports
 * @see E9 Fase 1: Migração de @/services/pricing
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface FreightCalculationParams {
  organizationId: number;
  branchId: number;
  customerId?: number;
  
  // Dados da Carga
  realWeight: number; // Peso real em kg
  volume?: number; // Volume em m³ (para calcular cubagem)
  invoiceValue: number; // Valor da NF (para Ad Valorem)
  
  // Rota
  originState: string; // UF origem (ex: SP)
  destinationState: string; // UF destino (ex: RJ)
  
  // Tipo de Transporte
  transportType: 'FTL_LOTACAO' | 'LTL_FRACIONADO';
}

export interface FreightComponent {
  name: string;
  type: string;
  calculationBase: number;
  rate: number;
  value: number;
}

export interface FreightCalculationResult {
  freightWeight: number;
  realWeight: number;
  cubicWeight: number;
  baseFreight: number;
  components: FreightComponent[];
  subtotal: number;
  total: number;
  tableUsed: {
    id: number;
    name: string;
    type: string;
  };
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Gateway para cálculo de frete.
 *
 * Implementação em infrastructure/adapters/FreightCalculatorAdapter.ts
 */
export interface IFreightCalculatorGateway {
  /**
   * Calcula frete para uma operação
   */
  calculate(params: FreightCalculationParams): Promise<Result<FreightCalculationResult, string>>;
  
  /**
   * Simula múltiplos cenários de frete
   */
  simulateScenarios(
    baseParams: FreightCalculationParams,
    scenarios: Partial<FreightCalculationParams>[]
  ): Promise<Result<FreightCalculationResult[], string>>;
}
