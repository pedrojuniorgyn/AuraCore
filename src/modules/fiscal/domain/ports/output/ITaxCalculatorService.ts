/**
 * ITaxCalculatorService - Output Port
 *
 * Interface para calculo de impostos (ICMS, ST, FCP, CFOP, CST).
 * Isola os Use Cases do servico legacy de calculo tributario.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 * @since E10.3
 */
import { Result } from '@/shared/domain';

export interface TaxCalculationInput {
  organizationId: number;
  originUf: string;
  destinationUf: string;
  regime?: string;
  date?: Date;
}

export interface TaxCalculationOutput {
  icmsRate: number;
  icmsStRate?: number;
  icmsReduction: number;
  fcpRate: number;
  cfop: string;
  cst: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface IcmsCalculationOutput {
  baseValue: number;
  icmsValue: number;
  icmsRate: number;
  icmsReduction: number;
}

export interface ITaxCalculatorService {
  /**
   * Calcula impostos com base na matriz tributaria configurada
   */
  calculateTax(input: TaxCalculationInput): Promise<Result<TaxCalculationOutput, string>>;

  /**
   * Calcula valor de ICMS a partir do valor do servico e informacoes tributarias
   */
  calculateIcmsValue(
    serviceValue: number,
    taxInfo: TaxCalculationOutput,
  ): Result<IcmsCalculationOutput, string>;

  /**
   * Verifica se existe regra fiscal configurada para a combinacao UF origem/destino
   */
  hasTaxRule(
    organizationId: number,
    originUf: string,
    destinationUf: string,
    regime?: string,
  ): Promise<Result<boolean, string>>;
}
