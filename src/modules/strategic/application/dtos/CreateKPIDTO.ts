/**
 * DTO: CreateKPI (Key Performance Indicator)
 * 
 * Schema Zod para validação de criação de KPI.
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';

/**
 * Polaridade do KPI
 */
export const KPIPolarityEnum = z.enum(['UP', 'DOWN']);
export type KPIPolarityType = z.infer<typeof KPIPolarityEnum>;

/**
 * Frequência de medição
 */
export const KPIFrequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
export type KPIFrequencyType = z.infer<typeof KPIFrequencyEnum>;

/**
 * Módulos fonte para cálculo automático
 */
export const SourceModuleEnum = z.enum(['FINANCIAL', 'TMS', 'WMS', 'FISCAL', 'HR']);
export type SourceModuleType = z.infer<typeof SourceModuleEnum>;

/**
 * Schema de validação para criação de KPI
 */
export const CreateKPIInputSchema = z.object({
  /**
   * ID do objetivo estratégico vinculado (opcional)
   */
  goalId: z.string().uuid('goalId deve ser um UUID válido').optional(),

  /**
   * Código único do KPI (ex: KPI-FIN-001)
   */
  code: z.string()
    .min(3, 'code deve ter no mínimo 3 caracteres')
    .max(30, 'code deve ter no máximo 30 caracteres')
    .regex(/^[A-Z0-9\-_]+$/, 'code deve conter apenas letras maiúsculas, números, - e _'),

  /**
   * Nome do KPI
   */
  name: z.string()
    .min(5, 'name deve ter no mínimo 5 caracteres')
    .max(200, 'name deve ter no máximo 200 caracteres'),

  /**
   * Descrição detalhada
   */
  description: z.string()
    .max(1000, 'description deve ter no máximo 1000 caracteres')
    .optional(),

  /**
   * Unidade de medida
   */
  unit: z.string()
    .min(1, 'unit é obrigatório')
    .max(20, 'unit deve ter no máximo 20 caracteres'),

  /**
   * Polaridade: UP (maior é melhor) ou DOWN (menor é melhor)
   */
  polarity: KPIPolarityEnum.default('UP'),

  /**
   * Frequência de medição
   */
  frequency: KPIFrequencyEnum.default('MONTHLY'),

  /**
   * Valor meta
   */
  targetValue: z.number({ message: 'targetValue é obrigatório' }),

  /**
   * Valor de referência inicial
   */
  baselineValue: z.number().optional(),

  /**
   * Threshold para alerta amarelo (% de desvio)
   */
  alertThreshold: z.number()
    .min(0, 'alertThreshold deve ser no mínimo 0')
    .max(100, 'alertThreshold deve ser no máximo 100')
    .default(10),

  /**
   * Threshold para alerta vermelho (% de desvio)
   */
  criticalThreshold: z.number()
    .min(0, 'criticalThreshold deve ser no mínimo 0')
    .max(100, 'criticalThreshold deve ser no máximo 100')
    .default(20),

  /**
   * Se o KPI é calculado automaticamente
   */
  autoCalculate: z.boolean().default(false),

  /**
   * Módulo fonte para cálculo automático
   */
  sourceModule: SourceModuleEnum.optional(),

  /**
   * Query ou configuração JSON para cálculo automático
   */
  sourceQuery: z.string()
    .max(2000, 'sourceQuery deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * ID do usuário responsável pelo KPI
   */
  ownerUserId: z.string().uuid('ownerUserId deve ser um UUID válido'),
}).refine(
  (data) => {
    // Se autoCalculate = true, sourceModule é obrigatório
    if (data.autoCalculate && !data.sourceModule) {
      return false;
    }
    return true;
  },
  {
    message: 'sourceModule é obrigatório quando autoCalculate = true',
    path: ['sourceModule'],
  }
).refine(
  (data) => {
    // criticalThreshold deve ser >= alertThreshold
    return data.criticalThreshold >= data.alertThreshold;
  },
  {
    message: 'criticalThreshold deve ser maior ou igual a alertThreshold',
    path: ['criticalThreshold'],
  }
);

export type CreateKPIInput = z.infer<typeof CreateKPIInputSchema>;

/**
 * Schema de output após criação
 */
export const CreateKPIOutputSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
});

export type CreateKPIOutput = z.infer<typeof CreateKPIOutputSchema>;
