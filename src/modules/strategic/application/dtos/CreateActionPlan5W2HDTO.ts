/**
 * DTO: CreateActionPlan5W2H
 * Schema Zod para criação de Plano de Ação 5W2H
 * 
 * 5W2H: What, Why, Where, When, Who, How, How Much
 * 
 * @module strategic/application/dtos
 * @see action-plan.schema.ts
 */
import { z } from 'zod';

// ============================================================================
// VALUE SCHEMAS
// ============================================================================

/**
 * Status do Plano de Ação
 */
export const ActionPlanStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'BLOCKED',
], {
  message: 'Status do plano de ação inválido. Use: DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED ou BLOCKED',
});

/**
 * Prioridade do Plano de Ação
 */
export const ActionPlanPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
], {
  message: 'Prioridade inválida. Use: LOW, MEDIUM, HIGH ou CRITICAL',
});

/**
 * Ciclo PDCA
 */
export const PdcaCycleValueSchema = z.enum([
  'PLAN',
  'DO',
  'CHECK',
  'ACT',
], {
  message: 'Ciclo PDCA inválido. Use: PLAN, DO, CHECK ou ACT',
});

export type ActionPlanStatus = z.infer<typeof ActionPlanStatusSchema>;
export type ActionPlanPriority = z.infer<typeof ActionPlanPrioritySchema>;
export type PdcaCycleValue = z.infer<typeof PdcaCycleValueSchema>;

// ============================================================================
// CREATE ACTION PLAN 5W2H
// ============================================================================

/**
 * Schema para criação de Plano de Ação 5W2H
 * 
 * Campos obrigatórios (alinhados ao schema do banco):
 * - code, what, why, whereLocation, whenStart, whenEnd, who, whoUserId, how
 * 
 * Campos opcionais:
 * - goalId, howMuchAmount, howMuchCurrency, priority
 */
export const CreateActionPlan5W2HInputSchema = z.object({
  // Identificação
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífen'),
  
  // Vínculo opcional com objetivo estratégico
  goalId: z.string().uuid('ID do objetivo inválido').optional(),
  
  // =========================================================================
  // 5W2H - OS 7 CAMPOS FUNDAMENTAIS
  // =========================================================================
  
  // WHAT - O QUE será feito (obrigatório)
  what: z.string()
    .min(1, 'O QUE (What) é obrigatório')
    .max(2000, 'O QUE deve ter no máximo 2000 caracteres'),
  
  // WHY - POR QUE será feito (obrigatório)
  why: z.string()
    .min(1, 'POR QUE (Why) é obrigatório')
    .max(2000, 'POR QUE deve ter no máximo 2000 caracteres'),
  
  // WHERE - ONDE será feito (obrigatório)
  whereLocation: z.string()
    .min(1, 'ONDE (Where) é obrigatório')
    .max(200, 'ONDE deve ter no máximo 200 caracteres'),
  
  // WHEN - QUANDO será feito (obrigatório: início e fim)
  whenStart: z.coerce.date({
    message: 'Data de início (When Start) é obrigatória',
  }),
  whenEnd: z.coerce.date({
    message: 'Data de término (When End) é obrigatória',
  }),
  
  // WHO - QUEM fará (obrigatório: nome e ID)
  who: z.string()
    .min(1, 'QUEM (Who) é obrigatório')
    .max(100, 'QUEM deve ter no máximo 100 caracteres'),
  whoUserId: z.string().uuid('ID do responsável (Who User ID) inválido'),
  
  // HOW - COMO será feito (obrigatório)
  how: z.string()
    .min(1, 'COMO (How) é obrigatório')
    .max(5000, 'COMO deve ter no máximo 5000 caracteres'),
  
  // HOW MUCH - QUANTO custará (opcional, SCHEMA-007: 2 colunas)
  howMuchAmount: z.number()
    .nonnegative('Custo não pode ser negativo')
    .optional(),
  howMuchCurrency: z.string()
    .length(3, 'Moeda deve ter exatamente 3 caracteres (ex: BRL)')
    .default('BRL'),
  
  // =========================================================================
  // CAMPOS ADICIONAIS
  // =========================================================================
  
  // Prioridade (padrão: MEDIUM)
  priority: ActionPlanPrioritySchema.default('MEDIUM'),
  
  // Próximo follow-up agendado
  nextFollowUpDate: z.coerce.date().optional(),
  
}).refine(
  (data) => data.whenEnd >= data.whenStart,
  {
    message: 'Data de término (When End) deve ser igual ou posterior à data de início (When Start)',
    path: ['whenEnd'],
  }
).refine(
  (data) => {
    // Se tem custo, deve ter moeda válida
    if (data.howMuchAmount !== undefined && data.howMuchAmount > 0) {
      return data.howMuchCurrency && data.howMuchCurrency.length === 3;
    }
    return true;
  },
  {
    message: 'Moeda (How Much Currency) é obrigatória quando há custo informado',
    path: ['howMuchCurrency'],
  }
);

export type CreateActionPlan5W2HInputDto = z.infer<typeof CreateActionPlan5W2HInputSchema>;

// ============================================================================
// HELPER: Validar 5W2H Completo
// ============================================================================

/**
 * Verifica se todos os campos 5W2H obrigatórios estão preenchidos
 */
export function validateComplete5W2H(data: CreateActionPlan5W2HInputDto): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!data.what?.trim()) missingFields.push('What (O QUE)');
  if (!data.why?.trim()) missingFields.push('Why (POR QUE)');
  if (!data.whereLocation?.trim()) missingFields.push('Where (ONDE)');
  if (!data.whenStart) missingFields.push('When Start (QUANDO - Início)');
  if (!data.whenEnd) missingFields.push('When End (QUANDO - Fim)');
  if (!data.who?.trim()) missingFields.push('Who (QUEM)');
  if (!data.whoUserId) missingFields.push('Who User ID (QUEM - ID)');
  if (!data.how?.trim()) missingFields.push('How (COMO)');
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
