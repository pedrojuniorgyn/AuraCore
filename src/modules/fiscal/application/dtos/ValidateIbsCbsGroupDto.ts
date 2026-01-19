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
 * 
 * NOTA: IbsCbsValidationError renomeado para evitar conflito com domain/ports/input/IValidateFiscalDocument
 */
export interface ValidateIbsCbsGroupOutput {
  valid: boolean;
  errors: IbsCbsValidationError[];
  warnings: ValidationWarning[];
}

export interface IbsCbsValidationError {
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

