import { z } from 'zod';

/**
 * Input para obter alíquotas vigentes
 */
export interface GetTaxRatesInput {
  organizationId: number;
  branchId: number;
  uf: string;
  municipioCode?: string;
  date: Date;
}

/**
 * Output com alíquotas
 */
export interface GetTaxRatesOutput {
  uf: string;
  municipioCode?: string;
  date: string;
  rates: TaxRates;
  source: 'DATABASE' | 'DEFAULT';
}

export interface TaxRates {
  ibsUf: number;
  ibsMun: number;
  cbs: number;
  is?: number;
}

/**
 * Input para compensação de tributos
 */
export interface CalculateCompensationInput {
  organizationId: number;
  branchId: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Output da compensação
 */
export interface CalculateCompensationOutput {
  period: { start: string; end: string };
  currentCredits: {
    pis: { amount: number; currency: string };
    cofins: { amount: number; currency: string };
    total: { amount: number; currency: string };
  };
  newCredits: {
    ibs: { amount: number; currency: string };
    cbs: { amount: number; currency: string };
    total: { amount: number; currency: string };
  };
  netPosition: { amount: number; currency: string };
  compensationAllowed: boolean;
}

/**
 * Schemas Zod para validação
 */
export const GetTaxRatesInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  uf: z.string().length(2),
  municipioCode: z.string().length(7).optional(),
  date: z.date(),
});

export const CalculateCompensationInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  periodStart: z.date(),
  periodEnd: z.date(),
});

