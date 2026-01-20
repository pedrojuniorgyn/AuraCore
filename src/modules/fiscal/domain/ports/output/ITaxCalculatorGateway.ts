/**
 * Gateway para cálculo de impostos
 * Encapsula lógica de cálculo de ICMS e outros tributos
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface TaxCalculationParams {
  organizationId: number;
  branchId: number;
  originUf: string;
  destinationUf: string;
  regime?: string;
  ncm?: string;
  productType?: string;
  value?: number;
}

export interface TaxMatrixResult {
  icmsRate: number;
  icmsStRate?: number;
  icmsReduction: number;
  fcpRate: number;
  cfop: string;
  cst: string;
  validFrom: Date;
  validTo: Date | null;
}

export interface IcmsCalculationParams {
  value: number;
  taxInfo: TaxMatrixResult;
}

export interface IcmsCalculationResult {
  base: number;
  value: number;
  effectiveRate: number;
}

export interface ITaxCalculatorGateway {
  calculateTax(params: TaxCalculationParams): Promise<Result<TaxMatrixResult, string>>;
  calculateIcmsValue(params: IcmsCalculationParams): Result<IcmsCalculationResult, string>;
}
