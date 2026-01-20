/**
 * DTO: RecordMeasurement (Registro de Medição de KPI)
 * 
 * Schema Zod para validação de registro de medição de KPI.
 * Equivalente ao UpdateKPIValue mas com foco em série histórica.
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';

/**
 * Tipo de origem do valor
 */
export const SourceTypeEnum = z.enum(['MANUAL', 'AUTO', 'IMPORT']);
export type SourceTypeType = z.infer<typeof SourceTypeEnum>;

/**
 * Status do KPI
 */
export const KPIStatusEnum = z.enum(['GREEN', 'YELLOW', 'RED']);
export type KPIStatusType = z.infer<typeof KPIStatusEnum>;

/**
 * Schema de validação para registro de medição
 */
export const RecordMeasurementInputSchema = z.object({
  /**
   * ID do KPI
   */
  kpiId: z.string().uuid('kpiId deve ser um UUID válido'),

  /**
   * Valor registrado
   */
  value: z.number({ message: 'value é obrigatório' }),

  /**
   * Data do período da medição
   */
  periodDate: z.string()
    .datetime('periodDate deve ser uma data ISO válida')
    .transform((val) => new Date(val))
    .optional(),

  /**
   * Tipo de origem do valor
   */
  sourceType: SourceTypeEnum.default('MANUAL'),

  /**
   * Notas/observações sobre a medição
   */
  notes: z.string()
    .max(500, 'notes deve ter no máximo 500 caracteres')
    .optional(),
}).refine(
  (data) => {
    // Se periodDate fornecido, não pode ser no futuro
    if (data.periodDate) {
      const period = data.periodDate instanceof Date ? data.periodDate : new Date(data.periodDate);
      return period <= new Date();
    }
    return true;
  },
  {
    message: 'periodDate não pode ser uma data futura',
    path: ['periodDate'],
  }
);

export type RecordMeasurementInput = z.infer<typeof RecordMeasurementInputSchema>;

/**
 * Schema de output após registro de medição
 */
export const RecordMeasurementOutputSchema = z.object({
  kpiId: z.string().uuid(),
  code: z.string(),
  previousValue: z.number(),
  newValue: z.number(),
  status: KPIStatusEnum,
  variance: z.number(),
  variancePercent: z.number(),
  alertTriggered: z.boolean(),
});

export type RecordMeasurementOutput = z.infer<typeof RecordMeasurementOutputSchema>;
