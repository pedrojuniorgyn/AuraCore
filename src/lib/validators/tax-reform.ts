import { z } from 'zod';

/**
 * Validators para API Routes de Reforma Tributária (IBS/CBS)
 * 
 * E7.4.1 Semana 8 - API Routes
 */

/**
 * Validator para POST /api/fiscal/tax-reform/calculate
 */
export const calculateIbsCbsSchema = z.object({
  fiscalDocumentId: z.string().uuid('fiscalDocumentId deve ser um UUID válido'),
  operationDate: z.string().datetime('operationDate deve ser uma data ISO válida'),
  items: z.array(
    z.object({
      itemId: z.string().uuid('itemId deve ser um UUID válido'),
      baseValue: z.number().nonnegative('baseValue não pode ser negativo'),
      cfop: z.string().length(4, 'cfop deve ter 4 caracteres'),
      ncm: z.string().length(8, 'ncm deve ter 8 caracteres'),
      ufOrigem: z.string().length(2, 'ufOrigem deve ter 2 caracteres'),
      ufDestino: z.string().length(2, 'ufDestino deve ter 2 caracteres'),
      municipioDestino: z.string().length(7, 'municipioDestino deve ter 7 caracteres').optional(),
    })
  ).min(1, 'items deve conter pelo menos 1 item'),
});

/**
 * Validator para POST /api/fiscal/tax-reform/simulate
 */
export const simulateTaxScenarioSchema = z.object({
  baseValue: z.number().positive('baseValue deve ser positivo'),
  ufOrigem: z.string().length(2, 'ufOrigem deve ter 2 caracteres'),
  ufDestino: z.string().length(2, 'ufDestino deve ter 2 caracteres'),
  years: z.array(
    z.number().min(2026, 'year deve ser >= 2026').max(2050, 'year deve ser <= 2050')
  ).min(1, 'years deve conter pelo menos 1 ano').max(30, 'years pode ter no máximo 30 anos'),
});

/**
 * Validator para POST /api/fiscal/tax-reform/compare
 */
export const compareTaxRegimesSchema = z.object({
  fiscalDocumentId: z.string().uuid('fiscalDocumentId deve ser um UUID válido'),
  regimes: z.array(
    z.enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'])
  ).optional().default(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL']),
});

/**
 * Validator para GET /api/fiscal/tax-reform/rates (query params)
 */
export const getTaxRatesSchema = z.object({
  uf: z.string().length(2, 'uf deve ter 2 caracteres'),
  municipioCode: z.string().length(7, 'municipioCode deve ter 7 caracteres').optional(),
  date: z.string().datetime('date deve ser uma data ISO válida'),
});

/**
 * Validator para POST /api/fiscal/tax-reform/compensation
 */
export const calculateCompensationSchema = z.object({
  periodStart: z.string().datetime('periodStart deve ser uma data ISO válida'),
  periodEnd: z.string().datetime('periodEnd deve ser uma data ISO válida'),
});

/**
 * Validator para POST /api/fiscal/tax-reform/validate
 */
export const validateIbsCbsGroupSchema = z.object({
  fiscalDocumentId: z.string().uuid('fiscalDocumentId deve ser um UUID válido'),
});

/**
 * Validator para POST /api/fiscal/tax-reform/audit
 */
export const auditTaxTransitionSchema = z.object({
  fiscalDocumentId: z.string().uuid('fiscalDocumentId deve ser um UUID válido'),
  currentTaxes: z.object({
    icms: z.number().nonnegative('icms não pode ser negativo').optional(),
    pis: z.number().nonnegative('pis não pode ser negativo').optional(),
    cofins: z.number().nonnegative('cofins não pode ser negativo').optional(),
    ipi: z.number().nonnegative('ipi não pode ser negativo').optional(),
  }),
  newTaxes: z.object({
    ibsUf: z.number().nonnegative('ibsUf não pode ser negativo'),
    ibsMun: z.number().nonnegative('ibsMun não pode ser negativo'),
    cbs: z.number().nonnegative('cbs não pode ser negativo'),
    is: z.number().nonnegative('is não pode ser negativo').optional(),
  }),
});

