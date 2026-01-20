/**
 * DTO: CreatePdcaCycle (Ciclo PDCA)
 * 
 * Schema Zod para validação de criação de ciclo PDCA.
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';

/**
 * Fases PDCA válidas
 */
export const PdcaPhaseSchema = z.enum(['PLAN', 'DO', 'CHECK', 'ACT'], {
  message: 'Fase PDCA inválida. Use: PLAN, DO, CHECK ou ACT',
});
export type PdcaPhaseType = z.infer<typeof PdcaPhaseSchema>;

/**
 * Status do ciclo PDCA
 */
export const PdcaCycleStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'], {
  message: 'Status do ciclo inválido',
});
export type PdcaCycleStatusType = z.infer<typeof PdcaCycleStatusSchema>;

/**
 * Schema de validação para criação de ciclo PDCA
 */
export const CreatePdcaCycleInputSchema = z.object({
  /**
   * Código único do ciclo (ex: PDCA-2026-001)
   */
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífen'),

  /**
   * Título do ciclo
   */
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(255, 'Título deve ter no máximo 255 caracteres'),

  /**
   * Descrição detalhada
   */
  description: z.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Vínculo opcional com objetivo estratégico BSC
   */
  objectiveId: z.string().uuid('ID do objetivo inválido').optional(),

  /**
   * Vínculo opcional com KPI (requer objectiveId)
   */
  kpiId: z.string().uuid('ID do KPI inválido').optional(),

  /**
   * ID do responsável pelo ciclo
   */
  ownerId: z.string().uuid('ID do responsável inválido').optional(),

  /**
   * Nome do responsável
   */
  ownerName: z.string().max(255).optional(),

  /**
   * Data de início
   */
  startDate: z.coerce.date().optional(),

  /**
   * Data alvo para conclusão
   */
  targetDate: z.coerce.date().optional(),
}).refine(
  (data) => !data.startDate || !data.targetDate || data.targetDate >= data.startDate,
  { 
    message: 'Data alvo deve ser igual ou posterior à data de início', 
    path: ['targetDate'] 
  }
).refine(
  (data) => !data.kpiId || data.objectiveId,
  { 
    message: 'KPI só pode ser vinculado se houver um objetivo vinculado', 
    path: ['kpiId'] 
  }
);

export type CreatePdcaCycleInput = z.infer<typeof CreatePdcaCycleInputSchema>;

/**
 * Schema de output após criação
 */
export const CreatePdcaCycleOutputSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  currentPhase: PdcaPhaseSchema,
  status: PdcaCycleStatusSchema,
});

export type CreatePdcaCycleOutput = z.infer<typeof CreatePdcaCycleOutputSchema>;
