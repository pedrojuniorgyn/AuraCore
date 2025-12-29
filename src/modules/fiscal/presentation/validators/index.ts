import { z } from 'zod';

/**
 * Validator: Criar Documento Fiscal
 */
export const CreateFiscalDocumentSchema = z.object({
  documentType: z.enum(['NFE', 'CTE', 'MDFE', 'NFSE'], {
    message: 'Tipo de documento inválido. Use: NFE, CTE, MDFE ou NFSE'
  }),
  series: z.string().min(1).max(10, 'Série deve ter no máximo 10 caracteres'),
  issueDate: z.string().datetime().or(z.date()),
  
  // Emitente (obrigatório)
  issuerId: z.string().uuid('ID do emitente deve ser um UUID válido'),
  issuerCnpj: z.string().length(14, 'CNPJ do emitente deve ter 14 dígitos'),
  issuerName: z.string().min(1).max(255, 'Nome do emitente deve ter no máximo 255 caracteres'),
  
  // Destinatário (opcional - ex: CTe sem destinatário específico)
  recipientId: z.string().uuid('ID do destinatário deve ser um UUID válido').optional(),
  recipientCnpjCpf: z.string().min(11).max(14, 'CPF/CNPJ deve ter 11 ou 14 dígitos').optional(),
  recipientName: z.string().min(1).max(255, 'Nome do destinatário deve ter no máximo 255 caracteres').optional(),
  
  // Items (mínimo 1)
  items: z.array(z.object({
    description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
    quantity: z.number().positive('Quantidade deve ser maior que zero'),
    unitPrice: z.number().nonnegative('Preço unitário não pode ser negativo'),
    ncm: z.string().length(8, 'NCM deve ter exatamente 8 dígitos').optional(),
    cfop: z.string().length(4, 'CFOP deve ter exatamente 4 dígitos'),
    unitOfMeasure: z.string().min(1).max(10, 'Unidade de medida deve ter no máximo 10 caracteres'),
    currency: z.string().length(3, 'Moeda deve ter 3 caracteres (ISO 4217)').default('BRL'),
  })).min(1, 'Documento deve ter pelo menos 1 item'),
  
  notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(),
});

export type CreateFiscalDocumentInput = z.infer<typeof CreateFiscalDocumentSchema>;

/**
 * Validator: Autorizar Documento Fiscal
 */
export const AuthorizeFiscalDocumentSchema = z.object({
  fiscalKey: z.string().length(44, 'Chave fiscal deve ter exatamente 44 dígitos'),
  protocolNumber: z.string().min(1).max(50, 'Número do protocolo deve ter no máximo 50 caracteres'),
  protocolDate: z.string().datetime().or(z.date()).optional(), // Default: now
});

export type AuthorizeFiscalDocumentInput = z.infer<typeof AuthorizeFiscalDocumentSchema>;

/**
 * Validator: Cancelar Documento Fiscal
 */
export const CancelFiscalDocumentSchema = z.object({
  reason: z.string()
    .min(15, 'Motivo do cancelamento deve ter no mínimo 15 caracteres (exigência SEFAZ)')
    .max(255, 'Motivo do cancelamento deve ter no máximo 255 caracteres'),
  protocolNumber: z.string().min(1).max(50, 'Número do protocolo deve ter no máximo 50 caracteres'),
});

export type CancelFiscalDocumentInput = z.infer<typeof CancelFiscalDocumentSchema>;

/**
 * Validator: Calcular Impostos
 */
export const CalculateTaxesSchema = z.object({
  // Pode ser vazio - usa dados do documento já salvo
  recalculate: z.boolean().optional().default(false),
});

export type CalculateTaxesInput = z.infer<typeof CalculateTaxesSchema>;

/**
 * Validator: Query Params para Listagem
 */
export const ListFiscalDocumentsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default(() => 1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(() => 20),
  status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORIZED', 'CANCELLED', 'REJECTED']).optional(),
  documentType: z.enum(['NFE', 'CTE', 'MDFE', 'NFSE']).optional(),
  issueDateFrom: z.string().datetime().or(z.date()).optional(),
  issueDateTo: z.string().datetime().or(z.date()).optional(),
});

export type ListFiscalDocumentsQuery = z.infer<typeof ListFiscalDocumentsQuerySchema>;

/**
 * Helper: Validar UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper: Mapear erro do Result para status HTTP
 */
export function getHttpStatusFromError(error: string): number {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('not found') || lowerError.includes('não encontrad')) {
    return 404;
  }
  
  if (lowerError.includes('permission') || lowerError.includes('access') || 
      lowerError.includes('permissão') || lowerError.includes('acesso')) {
    return 403;
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('validation') || 
      lowerError.includes('inválid') || lowerError.includes('validação')) {
    return 400;
  }
  
  if (lowerError.includes('conflict') || lowerError.includes('already') || 
      lowerError.includes('conflito') || lowerError.includes('já exist')) {
    return 409;
  }
  
  if (lowerError.includes('cannot') || lowerError.includes('impossible') ||
      lowerError.includes('não pode') || lowerError.includes('impossível')) {
    return 422; // Unprocessable Entity
  }
  
  return 400; // Default para erros de negócio
}

