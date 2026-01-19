/**
 * SubmitFiscalDocument DTO - Schema Zod para validação
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input/ISubmitFiscalDocument
 */
import { z } from 'zod';

export const SubmitFiscalDocumentDtoSchema = z.object({
  fiscalDocumentId: z.string().uuid('ID do documento fiscal deve ser um UUID válido'),
  transmissionMode: z.enum(['SYNC', 'ASYNC']).optional().default('SYNC'),
  contingencyMode: z.boolean().optional().default(false),
  contingencyReason: z.string().max(256).optional(),
}).refine(
  (data) => !data.contingencyMode || (data.contingencyMode && data.contingencyReason),
  { message: 'Motivo de contingência é obrigatório quando em modo contingência', path: ['contingencyReason'] }
);

export type SubmitFiscalDocumentDtoInput = z.infer<typeof SubmitFiscalDocumentDtoSchema>;

export interface SubmitFiscalDocumentDtoOutput {
  fiscalDocumentId: string;
  status: string;
  fiscalKey?: string;
  protocol?: string;
  authorizationDate?: Date;
  errors?: string[];
}
