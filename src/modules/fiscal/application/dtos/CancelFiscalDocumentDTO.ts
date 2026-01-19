/**
 * CancelFiscalDocument DTO - Schema Zod para validação
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input/ICancelFiscalDocument
 */
import { z } from 'zod';

export const CancelFiscalDocumentDtoSchema = z.object({
  fiscalDocumentId: z.string().uuid('ID do documento fiscal deve ser um UUID válido'),
  reason: z.string().min(15, 'Justificativa deve ter no mínimo 15 caracteres').max(255),
});

export type CancelFiscalDocumentDtoInput = z.infer<typeof CancelFiscalDocumentDtoSchema>;

export interface CancelFiscalDocumentDtoOutput {
  fiscalDocumentId: string;
  status: string;
  cancellationProtocol?: string;
  cancellationDate: Date;
}
