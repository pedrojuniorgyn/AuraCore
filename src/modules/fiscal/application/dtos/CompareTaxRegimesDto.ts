import { z } from 'zod';

/**
 * Input para comparação de regimes tributários (DTO)
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input/ICompareTaxRegimes
 */
export interface CompareTaxRegimesDtoInput {
  organizationId: number;
  branchId: number;
  fiscalDocumentId: string;
}

/**
 * Output da comparação (DTO)
 */
export interface CompareTaxRegimesDtoOutput {
  currentRegime: CurrentRegimeTaxes;
  newRegime: NewRegimeTaxes;
  difference: { amount: number; currency: string };
  percentageChange: number;
  recommendation: string;
}

export interface CurrentRegimeTaxes {
  icms: { amount: number; currency: string };
  pis: { amount: number; currency: string };
  cofins: { amount: number; currency: string };
  ipi?: { amount: number; currency: string };
  total: { amount: number; currency: string };
}

export interface NewRegimeTaxes {
  ibsUf: { amount: number; currency: string };
  ibsMun: { amount: number; currency: string };
  cbs: { amount: number; currency: string };
  is?: { amount: number; currency: string };
  total: { amount: number; currency: string };
}

/**
 * Schema Zod para validação
 */
export const CompareTaxRegimesInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  fiscalDocumentId: z.string().uuid(),
});

