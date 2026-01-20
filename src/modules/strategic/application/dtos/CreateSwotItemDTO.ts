/**
 * DTO: CreateSwotItem
 * Schema Zod para criação de Item SWOT
 * 
 * SWOT: Strengths, Weaknesses, Opportunities, Threats
 * - Strengths (Forças): Vantagens internas
 * - Weaknesses (Fraquezas): Desvantagens internas
 * - Opportunities (Oportunidades): Fatores externos positivos
 * - Threats (Ameaças): Fatores externos negativos
 * 
 * @module strategic/application/dtos
 * @see swot-analysis.schema.ts
 */
import { z } from 'zod';

// ============================================================================
// VALUE SCHEMAS
// ============================================================================

/**
 * Quadrante SWOT
 */
export const SwotQuadrantSchema = z.enum([
  'STRENGTH',
  'WEAKNESS',
  'OPPORTUNITY',
  'THREAT',
], {
  message: 'Quadrante SWOT inválido. Use: STRENGTH, WEAKNESS, OPPORTUNITY ou THREAT',
});

/**
 * Status do Item SWOT
 */
export const SwotStatusSchema = z.enum([
  'IDENTIFIED',
  'ANALYZING',
  'ACTION_DEFINED',
  'MONITORING',
  'RESOLVED',
], {
  message: 'Status SWOT inválido. Use: IDENTIFIED, ANALYZING, ACTION_DEFINED, MONITORING ou RESOLVED',
});

/**
 * Categoria do Item SWOT
 */
export const SwotCategorySchema = z.enum([
  'MARKET',
  'TECHNOLOGY',
  'FINANCIAL',
  'OPERATIONAL',
  'PEOPLE',
  'REGULATORY',
  'COMPETITIVE',
  'INFRASTRUCTURE',
  'OTHER',
], {
  message: 'Categoria SWOT inválida',
});

export type SwotQuadrant = z.infer<typeof SwotQuadrantSchema>;
export type SwotStatus = z.infer<typeof SwotStatusSchema>;
export type SwotCategory = z.infer<typeof SwotCategorySchema>;

// ============================================================================
// HELPER: Verificar se é fator externo
// ============================================================================

/**
 * Oportunidades e Ameaças são fatores EXTERNOS e requerem probabilidade
 */
export function isExternalFactor(quadrant: SwotQuadrant): boolean {
  return quadrant === 'OPPORTUNITY' || quadrant === 'THREAT';
}

/**
 * Forças e Fraquezas são fatores INTERNOS
 */
export function isInternalFactor(quadrant: SwotQuadrant): boolean {
  return quadrant === 'STRENGTH' || quadrant === 'WEAKNESS';
}

// ============================================================================
// CREATE SWOT ITEM
// ============================================================================

/**
 * Schema para criação de Item SWOT
 * 
 * Campos obrigatórios:
 * - quadrant, title, impactScore
 * 
 * Regras de negócio:
 * - Oportunidades e Ameaças (externos) DEVEM ter probabilityScore
 * - Forças e Fraquezas (internos) NÃO requerem probabilityScore
 * - priorityScore é calculado automaticamente (impact * probability)
 */
export const CreateSwotItemInputSchema = z.object({
  // Vínculo opcional com estratégia
  strategyId: z.string().uuid('ID da estratégia inválido').optional(),
  
  // =========================================================================
  // CLASSIFICAÇÃO
  // =========================================================================
  
  // Quadrante SWOT
  quadrant: SwotQuadrantSchema,
  
  // Categoria
  category: SwotCategorySchema.optional(),
  
  // =========================================================================
  // DESCRIÇÃO
  // =========================================================================
  
  // Título (obrigatório)
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  
  // Descrição detalhada
  description: z.string().max(2000).optional(),
  
  // =========================================================================
  // PRIORIZAÇÃO
  // =========================================================================
  
  // Score de Impacto (1-5, obrigatório)
  impactScore: z.number()
    .min(1, 'Score de impacto mínimo é 1')
    .max(5, 'Score de impacto máximo é 5'),
  
  // Score de Probabilidade (1-5, obrigatório para O e T)
  probabilityScore: z.number()
    .min(1, 'Score de probabilidade mínimo é 1')
    .max(5, 'Score de probabilidade máximo é 5')
    .optional(),
  
  // Status inicial
  status: SwotStatusSchema.default('IDENTIFIED'),
  
}).refine(
  (data) => {
    // Oportunidades e Ameaças DEVEM ter probabilityScore
    if (data.quadrant === 'OPPORTUNITY' || data.quadrant === 'THREAT') {
      return data.probabilityScore !== undefined;
    }
    return true;
  },
  {
    message: 'Oportunidades e Ameaças devem ter Score de Probabilidade informado',
    path: ['probabilityScore'],
  }
);

export type CreateSwotItemInputDto = z.infer<typeof CreateSwotItemInputSchema>;

// ============================================================================
// UPDATE SWOT ITEM
// ============================================================================

/**
 * Schema para atualização de Item SWOT
 */
export const UpdateSwotItemInputSchema = z.object({
  swotItemId: z.string().uuid('ID do item SWOT inválido'),
  
  // Campos atualizáveis
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: SwotCategorySchema.optional(),
  impactScore: z.number().min(1).max(5).optional(),
  probabilityScore: z.number().min(1).max(5).optional().nullable(),
  status: SwotStatusSchema.optional(),
  
  // Conversão para ação
  convertedToActionPlanId: z.string().uuid().optional().nullable(),
  convertedToGoalId: z.string().uuid().optional().nullable(),
});

export type UpdateSwotItemInputDto = z.infer<typeof UpdateSwotItemInputSchema>;

// ============================================================================
// HELPER: Calcular Priority Score
// ============================================================================

/**
 * Calcula o score de prioridade (impact * probability)
 * Para fatores internos (S/W), usa impact diretamente
 */
export function calculatePriorityScore(
  quadrant: SwotQuadrant,
  impactScore: number,
  probabilityScore?: number
): number {
  if (isExternalFactor(quadrant) && probabilityScore !== undefined) {
    return impactScore * probabilityScore;
  }
  // Para fatores internos, priority = impact * 3 (probabilidade média assume)
  return impactScore * 3;
}
