/**
 * GenerateSped DTO - Schema Zod para validação
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input
 */
import { z } from 'zod';

export const GenerateSpedFiscalDtoSchema = z.object({
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2020).max(2030),
  finalidade: z.enum(['ORIGINAL', 'RETIFICADORA']).optional().default('ORIGINAL'),
  includeInventory: z.boolean().optional().default(false),
});

export type GenerateSpedFiscalDtoInput = z.infer<typeof GenerateSpedFiscalDtoSchema>;

export const GenerateSpedContributionsDtoSchema = z.object({
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2020).max(2030),
  regime: z.enum(['LUCRO_REAL', 'LUCRO_PRESUMIDO']).optional().default('LUCRO_REAL'),
  tipoEscrituracao: z.enum(['ORIGINAL', 'RETIFICADORA']).optional().default('ORIGINAL'),
});

export type GenerateSpedContributionsDtoInput = z.infer<typeof GenerateSpedContributionsDtoSchema>;

export const GenerateSpedEcdDtoSchema = z.object({
  referenceYear: z.number().int().min(2020).max(2030),
  tipoEscrituracao: z.enum(['ORIGINAL', 'RETIFICADORA']).optional().default('ORIGINAL'),
  situacaoEspecial: z.enum(['NORMAL', 'EXTINCAO', 'CISAO', 'FUSAO', 'INCORPORACAO']).optional().default('NORMAL'),
});

export type GenerateSpedEcdDtoInput = z.infer<typeof GenerateSpedEcdDtoSchema>;

export interface GenerateSpedDtoOutput {
  fileName: string;
  fileSize: number;
  recordCount: number;
  generatedAt: Date;
  downloadUrl?: string;
}
