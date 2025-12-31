import { z } from 'zod';

/**
 * Input para cálculo de IBS/CBS
 */
export interface CalculateIbsCbsInput {
  fiscalDocumentId: string;
  organizationId: number;
  branchId: number;
  operationDate: Date;
  items: CalculateIbsCbsItemInput[];
}

export interface CalculateIbsCbsItemInput {
  itemId: string;
  baseValue: number;
  cfop: string;
  ncm: string;
  ufOrigem: string;
  ufDestino: string;
  municipioDestino?: string;
}

/**
 * Output do cálculo de IBS/CBS
 */
export interface CalculateIbsCbsOutput {
  regime: 'CURRENT' | 'TRANSITION' | 'NEW';
  items: CalculateIbsCbsItemOutput[];
  totals: CalculateTotals;
}

export interface CalculateIbsCbsItemOutput {
  itemId: string;
  baseValue: { amount: number; currency: string };
  ibsUfRate: number;
  ibsUfValue: { amount: number; currency: string };
  ibsMunRate: number;
  ibsMunValue: { amount: number; currency: string };
  cbsRate: number;
  cbsValue: { amount: number; currency: string };
  isValue?: { amount: number; currency: string };
}

export interface CalculateTotals {
  totalBaseValue: { amount: number; currency: string };
  totalIbsUf: { amount: number; currency: string };
  totalIbsMun: { amount: number; currency: string };
  totalCbs: { amount: number; currency: string };
  totalIs?: { amount: number; currency: string };
}

/**
 * Schema Zod para validação
 */
export const CalculateIbsCbsItemInputSchema = z.object({
  itemId: z.string().uuid(),
  baseValue: z.number().nonnegative(),
  cfop: z.string().length(4),
  ncm: z.string().min(8).max(8),
  ufOrigem: z.string().length(2),
  ufDestino: z.string().length(2),
  municipioDestino: z.string().length(7).optional(),
});

export const CalculateIbsCbsInputSchema = z.object({
  fiscalDocumentId: z.string().uuid(),
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  operationDate: z.date(),
  items: z.array(CalculateIbsCbsItemInputSchema).min(1),
});

