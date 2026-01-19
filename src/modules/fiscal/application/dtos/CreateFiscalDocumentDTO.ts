import { z } from 'zod';
import { DocumentType, DocumentStatus } from '../../domain/value-objects/DocumentType';

/**
 * DTO: Create Fiscal Document Input
 * 
 * NOTA: Renomeado para evitar conflito com domain/ports/input/ICreateFiscalDocument
 */
export const CreateFiscalDocumentDtoSchema = z.object({
  documentType: z.enum(['NFE', 'CTE', 'MDFE', 'NFSE'] as const),
  series: z.string().min(1).max(10),
  issueDate: z.string().datetime().or(z.date()),
  
  // Emitente (obrigatório)
  issuerId: z.string().min(1),
  issuerCnpj: z.string().length(14),
  issuerName: z.string().min(1).max(255),
  
  // Destinatário (opcional)
  recipientId: z.string().optional(),
  recipientCnpjCpf: z.string().min(11).max(14).optional(),
  recipientName: z.string().min(1).max(255).optional(),
  
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    ncm: z.string().length(8).optional(),
    cfop: z.string().length(4),
    unitOfMeasure: z.string().min(1).max(10),
  })).min(1),
  notes: z.string().max(2000).optional(),
});

export type CreateFiscalDocumentDtoInput = z.infer<typeof CreateFiscalDocumentDtoSchema>;

/**
 * DTO: Create Fiscal Document Output
 */
export interface CreateFiscalDocumentDtoOutput {
  id: string;
  documentType: DocumentType;
  series: string;
  number: string;
  status: DocumentStatus;
  issueDate: Date;
  issuerId: string;
  issuerName: string;
  recipientCnpjCpf?: string;
  recipientName?: string;
  totalDocument: number;
  itemsCount: number;
  createdAt: Date;
}

