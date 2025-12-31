import { z } from 'zod';

/**
 * Input para simulação de cenários tributários
 */
export interface SimulateTaxScenarioInput {
  organizationId: number;
  branchId: number;
  baseValue: number;
  ufOrigem: string;
  ufDestino: string;
  years: number[]; // Ex: [2026, 2027, 2029, 2030, 2031, 2032, 2033]
}

/**
 * Output da simulação
 */
export interface SimulateTaxScenarioOutput {
  scenarios: TaxScenario[];
  comparison: TaxComparison;
}

export interface TaxScenario {
  year: number;
  regime: 'CURRENT' | 'TRANSITION' | 'NEW';
  currentTaxes: {
    icms: { amount: number; currency: string };
    pis: { amount: number; currency: string };
    cofins: { amount: number; currency: string };
  };
  newTaxes: {
    ibsUf: { amount: number; currency: string };
    ibsMun: { amount: number; currency: string };
    cbs: { amount: number; currency: string };
  };
  totalTaxBurden: { amount: number; currency: string };
}

export interface TaxComparison {
  currentSystemTotal: { amount: number; currency: string };
  newSystemTotal: { amount: number; currency: string };
  difference: { amount: number; currency: string };
  percentageChange: number;
}

/**
 * Schema Zod para validação
 */
export const SimulateTaxScenarioInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  baseValue: z.number().positive(),
  ufOrigem: z.string().length(2),
  ufDestino: z.string().length(2),
  years: z.array(z.number().min(2026).max(2050)).min(1).max(30),
});

