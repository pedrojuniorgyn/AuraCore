/**
 * DTO: UpdatePdcaAction (Atualizar Ação PDCA)
 * 
 * Schema Zod para validação de atualização de ação PDCA.
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';
import { PdcaActionStatusSchema, PdcaActionPrioritySchema } from './AddPdcaActionDTO';

/**
 * Schema de validação para atualizar ação PDCA
 */
export const UpdatePdcaActionInputSchema = z.object({
  /**
   * ID da ação (obrigatório)
   */
  actionId: z.string().uuid('ID da ação inválido'),

  /**
   * Título da ação
   */
  title: z.string()
    .min(1, 'Título não pode ser vazio')
    .max(255, 'Título deve ter no máximo 255 caracteres')
    .optional(),

  /**
   * Descrição detalhada
   */
  description: z.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Resultado esperado
   */
  expectedResult: z.string()
    .max(2000, 'Resultado esperado deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Resultado real (preenchido durante/após execução)
   */
  actualResult: z.string()
    .max(2000, 'Resultado real deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Status da ação
   */
  status: PdcaActionStatusSchema.optional(),

  /**
   * Percentual de conclusão (0-100)
   */
  completionPercent: z.number()
    .min(0, 'Progresso mínimo é 0%')
    .max(100, 'Progresso máximo é 100%')
    .optional(),

  /**
   * ID do responsável
   */
  assigneeId: z.string().uuid().optional().nullable(),

  /**
   * Nome do responsável
   */
  assigneeName: z.string().max(255).optional().nullable(),

  /**
   * Prioridade
   */
  priority: PdcaActionPrioritySchema.optional(),

  /**
   * Data limite
   */
  dueDate: z.coerce.date().optional().nullable(),

  /**
   * ID da ação que bloqueia esta (dependência)
   */
  blockedBy: z.string().uuid().optional().nullable(),

  /**
   * Motivo do bloqueio
   */
  blockReason: z.string()
    .max(500, 'Motivo do bloqueio deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),

  /**
   * Notas de evidência
   */
  evidenceNotes: z.string()
    .max(2000, 'Notas de evidência deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Links de evidência (array de URLs)
   */
  evidenceLinks: z.array(z.string().url('URL inválida')).optional(),
}).refine(
  (data) => {
    // Se status = COMPLETED, completionPercent deve ser 100 (ou não informado)
    if (data.status === 'COMPLETED') {
      if (data.completionPercent !== undefined && data.completionPercent !== 100) {
        return false;
      }
    }
    return true;
  },
  { 
    message: 'Ação completa deve ter progresso de 100%', 
    path: ['completionPercent'] 
  }
).refine(
  (data) => {
    // Se status = BLOCKED, deve ter blockedBy OU blockReason
    if (data.status === 'BLOCKED') {
      if (!data.blockedBy && !data.blockReason) {
        return false;
      }
    }
    return true;
  },
  { 
    message: 'Ação bloqueada deve ter motivo ou dependência informada', 
    path: ['blockReason'] 
  }
);

export type UpdatePdcaActionInput = z.infer<typeof UpdatePdcaActionInputSchema>;

/**
 * Schema de output após atualização
 */
export const UpdatePdcaActionOutputSchema = z.object({
  id: z.string().uuid(),
  status: PdcaActionStatusSchema,
  completionPercent: z.number(),
  previousStatus: PdcaActionStatusSchema.optional(),
  cycleProgressUpdated: z.boolean(),
});

export type UpdatePdcaActionOutput = z.infer<typeof UpdatePdcaActionOutputSchema>;
