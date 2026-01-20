/**
 * DTO: UpdateActionPlan
 * Schema Zod para atualização de Plano de Ação
 * 
 * @module strategic/application/dtos
 * @see action-plan.schema.ts
 */
import { z } from 'zod';
import { 
  ActionPlanStatusSchema, 
  ActionPlanPrioritySchema, 
  PdcaCycleValueSchema 
} from './CreateActionPlan5W2HDTO';

// ============================================================================
// UPDATE ACTION PLAN
// ============================================================================

/**
 * Schema para atualização de Plano de Ação
 * 
 * Todos os campos são opcionais exceto actionPlanId
 * Inclui validações de negócio:
 * - COMPLETED requer completionPercent = 100
 * - COMPLETED requer pelo menos uma evidência
 */
export const UpdateActionPlanInputSchema = z.object({
  // ID obrigatório
  actionPlanId: z.string().uuid('ID do plano de ação inválido'),
  
  // =========================================================================
  // 5W2H ATUALIZÁVEIS
  // =========================================================================
  
  what: z.string().min(1).max(2000).optional(),
  why: z.string().min(1).max(2000).optional(),
  whereLocation: z.string().min(1).max(200).optional(),
  whenStart: z.coerce.date().optional(),
  whenEnd: z.coerce.date().optional(),
  who: z.string().min(1).max(100).optional(),
  whoUserId: z.string().uuid().optional(),
  how: z.string().min(1).max(5000).optional(),
  howMuchAmount: z.number().nonnegative().optional().nullable(),
  howMuchCurrency: z.string().length(3).optional(),
  
  // =========================================================================
  // STATUS E PROGRESSO
  // =========================================================================
  
  status: ActionPlanStatusSchema.optional(),
  priority: ActionPlanPrioritySchema.optional(),
  
  // Progresso (0-100%)
  completionPercent: z.number()
    .min(0, 'Progresso mínimo é 0%')
    .max(100, 'Progresso máximo é 100%')
    .optional(),
  
  // Ciclo PDCA
  pdcaCycle: PdcaCycleValueSchema.optional(),
  
  // =========================================================================
  // REPROPOSIÇÃO
  // =========================================================================
  
  parentActionPlanId: z.string().uuid().optional().nullable(),
  repropositionNumber: z.number().int().nonnegative().optional(),
  repropositionReason: z.string().max(2000).optional().nullable(),
  
  // =========================================================================
  // FOLLOW-UP E EVIDÊNCIAS
  // =========================================================================
  
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  evidenceUrls: z.array(z.string().url('URL de evidência inválida')).optional(),
  
}).refine(
  (data) => {
    // Validar datas se ambas forem informadas
    if (data.whenStart && data.whenEnd) {
      return data.whenEnd >= data.whenStart;
    }
    return true;
  },
  {
    message: 'Data de término deve ser igual ou posterior à data de início',
    path: ['whenEnd'],
  }
).refine(
  (data) => {
    // COMPLETED deve ter completionPercent = 100 (ou não informado, assume 100)
    if (data.status === 'COMPLETED') {
      return data.completionPercent === undefined || data.completionPercent === 100;
    }
    return true;
  },
  {
    message: 'Plano COMPLETO deve ter progresso de 100%',
    path: ['completionPercent'],
  }
).refine(
  (data) => {
    // COMPLETED deve ter evidências
    if (data.status === 'COMPLETED') {
      return data.evidenceUrls && data.evidenceUrls.length > 0;
    }
    return true;
  },
  {
    message: 'Plano COMPLETO deve ter pelo menos uma evidência anexada',
    path: ['evidenceUrls'],
  }
).refine(
  (data) => {
    // BLOCKED deve ter motivo na repropositionReason ou status anterior
    // (validação completa será feita no use case com acesso ao estado atual)
    return true;
  },
  {
    message: 'Plano BLOQUEADO deve ter motivo informado',
    path: ['repropositionReason'],
  }
);

export type UpdateActionPlanInputDto = z.infer<typeof UpdateActionPlanInputSchema>;

// ============================================================================
// COMPLETE ACTION PLAN (Atalho para completar)
// ============================================================================

/**
 * Schema simplificado para completar um Plano de Ação
 */
export const CompleteActionPlanInputSchema = z.object({
  actionPlanId: z.string().uuid('ID do plano de ação inválido'),
  
  // Evidências obrigatórias para completar
  evidenceUrls: z.array(z.string().url('URL de evidência inválida'))
    .min(1, 'Pelo menos uma evidência é obrigatória para completar'),
  
  // Observações finais
  completionNotes: z.string().max(2000).optional(),
});

export type CompleteActionPlanInputDto = z.infer<typeof CompleteActionPlanInputSchema>;
