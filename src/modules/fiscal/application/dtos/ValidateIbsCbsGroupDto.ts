import { z } from 'zod';

/**
 * Input para validação de grupo IBS/CBS
 */
export interface ValidateIbsCbsGroupInput {
  organizationId: number;
  branchId: number;
  fiscalDocumentId: string;
}

/**
 * Output da validação
 */
export interface ValidateIbsCbsGroupOutput {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

/**
 * Schema Zod para validação
 */
export const ValidateIbsCbsGroupInputSchema = z.object({
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  fiscalDocumentId: z.string().uuid(),
});

