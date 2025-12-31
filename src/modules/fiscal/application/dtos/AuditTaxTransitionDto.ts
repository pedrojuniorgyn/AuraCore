import { z } from 'zod';

/**
 * Input para auditoria de transição tributária
 */
export interface AuditTaxTransitionInput {
  organizationId: number;
  branchId: number;
  fiscalDocumentId: string;
  currentTaxes: CurrentTaxesDto;
  newTaxes: NewTaxesDto;
  calculatedBy: string;
}

export interface CurrentTaxesDto {
  icms?: number;
  pis?: number;
  cofins?: number;
  ipi?: number;
}

export interface NewTaxesDto {
  ibsUf: number;
  ibsMun: number;
  cbs: number;
  is?: number;
}

/**
 * Output da auditoria
 */
export interface AuditTaxTransitionOutput {
  auditId: string;
  createdAt: string;
}

/**
 * Schema Zod para validação
 */
export const CurrentTaxesDtoSchema = z.object({
  icms: z.number().nonnegative().optional(),
  pis: z.number().nonnegative().optional(),
  cofins: z.number().nonnegative().optional(),
  ipi: z.number().nonnegative().optional(),
});

export const NewTaxesDtoSchema = z.object({
  ibsUf: z.number().nonnegative(),
  ibsMun: z.number().nonnegative(),
  cbs: z.number().nonnegative(),
  is: z.number().nonnegative().optional(),
});

export const AuditTaxTransitionInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  fiscalDocumentId: z.string().uuid(),
  currentTaxes: CurrentTaxesDtoSchema,
  newTaxes: NewTaxesDtoSchema,
  calculatedBy: z.string().min(1),
});

