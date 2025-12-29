import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import {
  ICMSCalculationParams,
  ICMSCalculationResult,
  IPICalculationParams,
  PISCalculationParams,
  COFINSCalculationParams,
  ISSCalculationParams,
} from '../calculators';
import { TaxAmount } from '../value-objects';

/**
 * Resultado completo do cálculo de impostos
 */
export interface TaxCalculationResult {
  icms?: ICMSCalculationResult;
  ipi?: TaxAmount;
  pis?: TaxAmount;
  cofins?: TaxAmount;
  iss?: TaxAmount;
  
  totalTaxes: Money;
}

/**
 * Interface: Tax Engine
 * 
 * Define contrato para engines de cálculo tributário.
 * Permite diferentes implementações para:
 * - Sistema atual (ICMS/ISS/PIS/COFINS)
 * - Sistema de transição (2026-2032)
 * - Novo sistema (IBS/CBS/IS - 2033+)
 */
export interface ITaxEngine {
  /**
   * Calcula ICMS
   */
  calculateICMS(params: ICMSCalculationParams): Result<ICMSCalculationResult, string>;

  /**
   * Calcula IPI
   */
  calculateIPI(params: IPICalculationParams): Result<TaxAmount, string>;

  /**
   * Calcula PIS
   */
  calculatePIS(params: PISCalculationParams): Result<TaxAmount, string>;

  /**
   * Calcula COFINS
   */
  calculateCOFINS(params: COFINSCalculationParams): Result<TaxAmount, string>;

  /**
   * Calcula ISS
   */
  calculateISS(params: ISSCalculationParams): Result<TaxAmount, string>;

  /**
   * Calcula todos os impostos para um documento fiscal
   * 
   * Este método deve ser implementado por cada engine para calcular
   * todos os impostos aplicáveis a um documento fiscal específico.
   */
  calculateAll(params: unknown): Result<TaxCalculationResult, string>;
}

