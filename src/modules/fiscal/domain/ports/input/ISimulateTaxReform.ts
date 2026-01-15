/**
 * Input Port: Simulação de Reforma Tributária 2026
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface SimulateTaxReformInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Cenário: ATUAL (ICMS/PIS/COFINS) ou REFORMA (IBS/CBS) */
  scenario: 'CURRENT' | 'REFORM_2026';
  /** Alíquota IBS (se simulação reforma) */
  ibsRate?: number;
  /** Alíquota CBS (se simulação reforma) */
  cbsRate?: number;
}

export interface TaxScenarioComparison {
  scenario: string;
  taxes: Array<{
    taxType: string;
    baseAmount: number;
    rate: number;
    amount: number;
  }>;
  totalTax: number;
  totalDocument: number;
}

export interface SimulateTaxReformOutput {
  documentId: string;
  currentScenario: TaxScenarioComparison;
  reformScenario: TaxScenarioComparison;
  difference: {
    taxDifference: number;
    percentageChange: number;
  };
  simulatedAt: Date;
}

export interface ISimulateTaxReform {
  execute(
    input: SimulateTaxReformInput,
    context: ExecutionContext
  ): Promise<Result<SimulateTaxReformOutput, string>>;
}
