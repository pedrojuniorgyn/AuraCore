/**
 * DTO: WarRoom
 * Schemas Zod para filtros e output do War Room Dashboard
 * 
 * War Room: Dashboard executivo com visão consolidada da gestão estratégica
 * 
 * @module strategic/application/dtos
 * @see WarRoomDashboard.tsx
 */
import { z } from 'zod';

// ============================================================================
// VALUE SCHEMAS
// ============================================================================

/**
 * Perspectivas do BSC
 */
export const BscPerspectiveSchema = z.enum([
  'FINANCIAL',
  'CUSTOMER',
  'INTERNAL_PROCESS',
  'LEARNING_GROWTH',
], {
  message: 'Perspectiva BSC inválida',
});

/**
 * Tendência do KPI
 */
export const KpiTrendSchema = z.enum([
  'UP',
  'DOWN',
  'STABLE',
], {
  message: 'Tendência inválida',
});

export type BscPerspective = z.infer<typeof BscPerspectiveSchema>;
export type KpiTrend = z.infer<typeof KpiTrendSchema>;

// ============================================================================
// WAR ROOM FILTERS
// ============================================================================

/**
 * Schema de filtros para o War Room Dashboard
 * 
 * Permite filtrar por:
 * - Período (startDate/endDate)
 * - Perspectivas BSC
 * - Objetivos específicos
 * - Responsáveis
 * - Flags de criticidade
 */
export const WarRoomFiltersInputSchema = z.object({
  // =========================================================================
  // PERÍODO
  // =========================================================================
  
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  
  // =========================================================================
  // FILTROS DE ESCOPO
  // =========================================================================
  
  // Perspectivas BSC
  perspectives: z.array(BscPerspectiveSchema).optional(),
  
  // Objetivos específicos
  objectiveIds: z.array(z.string().uuid()).optional(),
  
  // Responsáveis específicos
  ownerIds: z.array(z.string().uuid()).optional(),
  
  // =========================================================================
  // FLAGS DE CRITICIDADE
  // =========================================================================
  
  // Mostrar apenas itens atrasados
  includeOverdueOnly: z.boolean().default(false),
  
  // Mostrar apenas KPIs críticos (abaixo da meta)
  includeCriticalKpisOnly: z.boolean().default(false),
  
  // =========================================================================
  // LIMITES DE RESULTADOS
  // =========================================================================
  
  // Máximo de ações atrasadas a retornar
  maxOverdueActions: z.number().int().positive().default(10),
  
  // Máximo de KPIs críticos a retornar
  maxCriticalKpis: z.number().int().positive().default(10),
  
}).refine(
  (data) => {
    // endDate deve ser >= startDate
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'Data final deve ser igual ou posterior à data inicial',
    path: ['endDate'],
  }
);

export type WarRoomFiltersInputDto = z.infer<typeof WarRoomFiltersInputSchema>;

// ============================================================================
// WAR ROOM OUTPUT
// ============================================================================

/**
 * Schema de saída do War Room Dashboard
 * 
 * Estrutura completa para renderização do dashboard executivo
 */
export const WarRoomOutputSchema = z.object({
  // =========================================================================
  // RESUMO BSC POR PERSPECTIVA
  // =========================================================================
  
  bscSummary: z.array(z.object({
    perspective: z.string(),
    totalObjectives: z.number(),
    achievedObjectives: z.number(),
    inProgressObjectives: z.number(),
    avgProgress: z.number(),
    kpisOnTarget: z.number(),
    kpisOffTarget: z.number(),
  })),
  
  // =========================================================================
  // KPIs CRÍTICOS (FORA DA META)
  // =========================================================================
  
  criticalKpis: z.array(z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    objectiveName: z.string(),
    perspective: z.string(),
    currentValue: z.number(),
    targetValue: z.number(),
    unit: z.string(),
    variancePercent: z.number(),
    trend: KpiTrendSchema,
    lastMeasurementDate: z.coerce.date().nullable(),
  })),
  
  // =========================================================================
  // AÇÕES ATRASADAS
  // =========================================================================
  
  overdueActions: z.array(z.object({
    id: z.string(),
    code: z.string(),
    what: z.string(),
    deadline: z.coerce.date(),
    daysOverdue: z.number(),
    ownerName: z.string().nullable(),
    priority: z.string(),
    linkedTo: z.string().nullable(), // "BSC: Objetivo X" ou "PDCA: Ciclo Y"
  })),
  
  // =========================================================================
  // PDCA EM ANDAMENTO
  // =========================================================================
  
  activePdcaCycles: z.array(z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    currentPhase: z.string(),
    overallProgress: z.number(),
    daysInCurrentPhase: z.number(),
    ownerName: z.string().nullable(),
  })),
  
  // =========================================================================
  // SWOT RESUMO
  // =========================================================================
  
  swotSummary: z.object({
    strengths: z.number(),
    weaknesses: z.number(),
    opportunities: z.number(),
    threats: z.number(),
    highImpactItems: z.number(),
    itemsWithoutActions: z.number(),
  }),
  
  // =========================================================================
  // MÉTRICAS GERAIS
  // =========================================================================
  
  metrics: z.object({
    // BSC
    totalObjectives: z.number(),
    achievedObjectives: z.number(),
    objectivesAtRisk: z.number(),
    
    // KPIs
    totalKpis: z.number(),
    kpisOnTarget: z.number(),
    kpisBelowTarget: z.number(),
    kpisAboveTarget: z.number(),
    
    // Ações
    totalActions: z.number(),
    completedActions: z.number(),
    inProgressActions: z.number(),
    overdueActions: z.number(),
    
    // PDCA
    activePdcaCycles: z.number(),
    completedPdcaCycles: z.number(),
  }),
  
  // =========================================================================
  // HEALTH SCORE
  // =========================================================================
  
  healthScore: z.number().min(0).max(1),
  
  // =========================================================================
  // TIMESTAMP
  // =========================================================================
  
  generatedAt: z.coerce.date(),
});

export type WarRoomOutputDto = z.infer<typeof WarRoomOutputSchema>;

// ============================================================================
// HELPER: Calcular Health Score
// ============================================================================

/**
 * Calcula o Health Score baseado nas métricas
 * 
 * Fórmula:
 * - KPIs on target: 40%
 * - Objectives achieved: 30%
 * - Actions not overdue: 20%
 * - PDCA progress: 10%
 */
export function calculateHealthScore(metrics: WarRoomOutputDto['metrics']): number {
  let score = 0;
  
  // KPIs on target (40%)
  if (metrics.totalKpis > 0) {
    const kpiScore = metrics.kpisOnTarget / metrics.totalKpis;
    score += kpiScore * 0.4;
  } else {
    score += 0.4; // Sem KPIs = neutro
  }
  
  // Objectives achieved (30%)
  if (metrics.totalObjectives > 0) {
    const objScore = metrics.achievedObjectives / metrics.totalObjectives;
    score += objScore * 0.3;
  } else {
    score += 0.3; // Sem objetivos = neutro
  }
  
  // Actions not overdue (20%)
  if (metrics.totalActions > 0) {
    const actionScore = (metrics.totalActions - metrics.overdueActions) / metrics.totalActions;
    score += actionScore * 0.2;
  } else {
    score += 0.2; // Sem ações = neutro
  }
  
  // PDCA progress (10%)
  const totalPdca = metrics.activePdcaCycles + metrics.completedPdcaCycles;
  if (totalPdca > 0) {
    const pdcaScore = metrics.completedPdcaCycles / totalPdca;
    score += pdcaScore * 0.1;
  } else {
    score += 0.1; // Sem PDCA = neutro
  }
  
  return Math.round(score * 100) / 100; // Arredondar para 2 casas
}
