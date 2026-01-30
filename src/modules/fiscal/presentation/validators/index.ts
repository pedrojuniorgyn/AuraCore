import { z } from 'zod';

/**
 * Validator: Criar Documento Fiscal
 */
export const CreateFiscalDocumentSchema = z.object({
  documentType: z.enum(['NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE'], {
    message: 'Tipo de documento inválido. Use: NFE, NFCE, CTE, MDFE ou NFSE'
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
    productCode: z.string().min(1, 'Código do produto é obrigatório').max(50, 'Código do produto deve ter no máximo 50 caracteres'),
    description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
    quantity: z.number().positive('Quantidade deve ser maior que zero'),
    unitPrice: z.number().nonnegative('Preço unitário não pode ser negativo'),
    ncm: z.string().length(8, 'NCM deve ter exatamente 8 dígitos').optional(),
    cfop: z.string().length(4, 'CFOP deve ter exatamente 4 dígitos'),
    unitOfMeasure: z.string().min(1).max(10, 'Unidade de medida deve ter no máximo 10 caracteres'),
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
  documentType: z.enum(['NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE']).optional(),
  issueDateFrom: z.string().datetime().or(z.date()).optional(),
  issueDateTo: z.string().datetime().or(z.date()).optional(),
});

export type ListFiscalDocumentsQuery = z.infer<typeof ListFiscalDocumentsQuerySchema>;

/**
 * Validator: Criar CTe (Conhecimento de Transporte Eletrônico)
 * 
 * Ref: Manual CTe 3.0 - SEFAZ
 */
export const CreateCteSchema = z.object({
  pickupOrderId: z.number().int().positive('ID da ordem de coleta deve ser um número positivo'),
  modal: z.enum(['01', '02', '03', '04', '05', '06'], {
    message: 'Modal inválido. Use: 01=Rodoviário, 02=Aéreo, 03=Aquaviário, 04=Ferroviário, 05=Dutoviário, 06=Multimodal'
  }).optional().default('01'), // Default: Rodoviário
  tipoServico: z.enum(['0', '1', '2', '3', '4'], {
    message: 'Tipo de serviço inválido. Use: 0=Normal, 1=Subcontratação, 2=Redespacho, 3=Redespacho Intermediário, 4=Vinculado Multimodal'
  }).optional().default('0'), // Default: Normal
  finalidade: z.enum(['1', '2', '3', '4']).optional().default('1'), // Default: Normal
  notes: z.string().max(2000).optional(),
});

export type CreateCteInput = z.infer<typeof CreateCteSchema>;

/**
 * Validator: Query Params para Listagem de CTe
 */
export const ListCteQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default(() => 1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(() => 20),
  status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORIZED', 'CANCELLED', 'REJECTED']).optional(),
  issueDateFrom: z.string().datetime().or(z.date()).optional(),
  issueDateTo: z.string().datetime().or(z.date()).optional(),
  chaveAcesso: z.string().regex(/^\d{44}$/).optional(), // Chave de acesso (44 dígitos)
  numero: z.string().regex(/^\d+$/).transform(Number).optional(),
  serie: z.string().max(10).optional(),
});

export type ListCteQuery = z.infer<typeof ListCteQuerySchema>;

/**
 * Validator: Criar MDFe (Manifesto de Documentos Fiscais Eletrônico)
 * 
 * Ref: Manual MDFe 3.0 - SEFAZ
 */
export const CreateMdfeSchema = z.object({
  tripId: z.number().int().positive('ID da viagem deve ser um número positivo'),
  cteIds: z.array(z.string().uuid('ID do CTe deve ser um UUID válido')).optional().default([]),
  modal: z.enum(['1', '2', '3', '4'], {
    message: 'Modal inválido. Use: 1=Rodoviário, 2=Aéreo, 3=Aquaviário, 4=Ferroviário'
  }).optional().default('1'), // Default: Rodoviário
  tipoEmitente: z.enum(['1', '2'], {
    message: 'Tipo de emitente inválido. Use: 1=Prestador de serviço de transporte, 2=Transportador de Carga Própria'
  }).optional().default('1'),
  tipoTransportador: z.enum(['1', '2', '3', '4'], {
    message: 'Tipo de transportador inválido. Use: 1=ETC, 2=TAC, 3=CTC, 4=Outros'
  }).optional().default('1'),
  ufInicio: z.string().length(2, 'UF deve ter 2 caracteres').toUpperCase(),
  ufFim: z.string().length(2, 'UF deve ter 2 caracteres').toUpperCase(),
  notes: z.string().max(2000).optional(),
});

export type CreateMdfeInput = z.infer<typeof CreateMdfeSchema>;

/**
 * Validator: Query Params para Listagem de MDFe
 */
export const ListMdfeQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default(() => 1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(() => 20),
  status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORIZED', 'CANCELLED', 'REJECTED', 'ENCERRADO']).optional(),
  tripId: z.string().uuid('ID da viagem deve ser um UUID válido').optional(),
});

export type ListMdfeQuery = z.infer<typeof ListMdfeQuerySchema>;

/**
 * Validator: Criar Regra na Matriz Tributária
 * 
 * Ref: Lei Complementar 87/96 (ICMS)
 */
export const CreateTaxMatrixRuleSchema = z.object({
  ufOrigin: z.string().length(2, 'UF de origem deve ter 2 caracteres').toUpperCase(),
  ufDestination: z.string().length(2, 'UF de destino deve ter 2 caracteres').toUpperCase(),
  cargoType: z.string().max(50, 'Tipo de carga deve ter no máximo 50 caracteres').optional().default('GERAL'),
  isContributor: z.boolean().optional().default(true),
  cstCode: z.string().regex(/^\d{2}$/, 'CST deve ter 2 dígitos'),
  icmsRate: z.number().min(0).max(100, 'Alíquota ICMS deve estar entre 0% e 100%'),
  fcpRate: z.number().min(0).max(100, 'Alíquota FCP deve estar entre 0% e 100%').optional().default(0),
  difalApplicable: z.boolean().optional().default(false),
  legalBasis: z.string().max(500, 'Base legal deve ter no máximo 500 caracteres').optional(),
});

export type CreateTaxMatrixRuleInput = z.infer<typeof CreateTaxMatrixRuleSchema>;

/**
 * Validator: Query Params para Listagem de Matriz Tributária
 */
export const ListTaxMatrixQuerySchema = z.object({
  ufOrigin: z.string().length(2).toUpperCase().optional(),
  ufDestination: z.string().length(2).toUpperCase().optional(),
  cargoType: z.string().max(50).optional(),
  isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

export type ListTaxMatrixQuery = z.infer<typeof ListTaxMatrixQuerySchema>;

/**
 * Validator: Autorizar CTe
 */
export const AuthorizeCteSchema = z.object({
  protocolNumber: z.string().min(1).max(50, 'Número do protocolo deve ter no máximo 50 caracteres'),
  chaveAcesso: z.string().regex(/^\d{44}$/, 'Chave de acesso deve ter 44 dígitos'),
});

export type AuthorizeCteInput = z.infer<typeof AuthorizeCteSchema>;

/**
 * Validator: Cancelar CTe
 */
export const CancelCteSchema = z.object({
  reason: z.string()
    .min(15, 'Motivo do cancelamento deve ter no mínimo 15 caracteres (exigência SEFAZ)')
    .max(255, 'Motivo do cancelamento deve ter no máximo 255 caracteres'),
  protocolNumber: z.string().min(1).max(50, 'Número do protocolo deve ter no máximo 50 caracteres').optional(),
});

export type CancelCteInput = z.infer<typeof CancelCteSchema>;

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

