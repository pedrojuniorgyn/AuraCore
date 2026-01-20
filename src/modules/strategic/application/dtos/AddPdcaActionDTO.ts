/**
 * DTO: AddPdcaAction (Adicionar Ação PDCA)
 * 
 * Schema Zod para validação de criação de ação dentro de um ciclo PDCA.
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';
import { PdcaPhaseSchema } from './CreatePdcaCycleDTO';

/**
 * Status da ação PDCA
 */
export const PdcaActionStatusSchema = z.enum([
  'PENDING',      // Aguardando início
  'IN_PROGRESS',  // Em execução
  'COMPLETED',    // Concluída
  'BLOCKED',      // Bloqueada por dependência ou impedimento
  'CANCELLED',    // Cancelada
], {
  message: 'Status da ação inválido',
});
export type PdcaActionStatusType = z.infer<typeof PdcaActionStatusSchema>;

/**
 * Prioridade da ação PDCA
 */
export const PdcaActionPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
  message: 'Prioridade inválida',
});
export type PdcaActionPriorityType = z.infer<typeof PdcaActionPrioritySchema>;

/**
 * Schema de validação para adicionar ação PDCA
 */
export const AddPdcaActionInputSchema = z.object({
  /**
   * ID do ciclo PDCA (obrigatório)
   */
  cycleId: z.string().uuid('ID do ciclo inválido'),

  /**
   * Fase a que a ação pertence
   */
  phase: PdcaPhaseSchema,

  /**
   * Título da ação
   */
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(255, 'Título deve ter no máximo 255 caracteres'),

  /**
   * Descrição detalhada da ação
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
   * ID do responsável pela ação
   */
  assigneeId: z.string().uuid('ID do responsável inválido').optional(),

  /**
   * Nome do responsável
   */
  assigneeName: z.string().max(255).optional(),

  /**
   * Prioridade da ação
   */
  priority: PdcaActionPrioritySchema.default('MEDIUM'),

  /**
   * Data limite para conclusão
   */
  dueDate: z.coerce.date().optional(),

  /**
   * Ordem de sequência dentro da fase
   */
  sequenceOrder: z.number()
    .int('Ordem deve ser um número inteiro')
    .nonnegative('Ordem deve ser não negativa')
    .optional(),
});

export type AddPdcaActionInput = z.infer<typeof AddPdcaActionInputSchema>;

/**
 * Schema de output após adicionar ação
 */
export const AddPdcaActionOutputSchema = z.object({
  id: z.string().uuid(),
  cycleId: z.string().uuid(),
  phase: PdcaPhaseSchema,
  title: z.string(),
  status: PdcaActionStatusSchema,
  sequenceOrder: z.number(),
});

export type AddPdcaActionOutput = z.infer<typeof AddPdcaActionOutputSchema>;
