/**
 * ListFiscalDocuments DTO - Schema Zod para validação
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input/IListFiscalDocuments
 */
import { z } from 'zod';

export const ListFiscalDocumentsDtoSchema = z.object({
  documentType: z.enum(['NFE', 'CTE', 'MDFE', 'NFSE']).optional(),
  status: z.enum(['DRAFT', 'VALIDATED', 'SUBMITTED', 'AUTHORIZED', 'CANCELLED', 'REJECTED']).optional(),
  issueDateFrom: z.coerce.date().optional(),
  issueDateTo: z.coerce.date().optional(),
  recipientCnpjCpf: z.string().min(11).max(14).optional(),
  series: z.string().max(10).optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});

export type ListFiscalDocumentsDtoInput = z.infer<typeof ListFiscalDocumentsDtoSchema>;
