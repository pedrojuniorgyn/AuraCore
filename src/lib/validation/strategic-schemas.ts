import { z } from 'zod';

/**
 * Strategic Module - Zod Validation Schemas
 *
 * Schemas de validação para módulo Strategic (BSC, OKR, PDCA)
 *
 * @see Sprint Blindagem S1.1 Batch 3
 */

// ============================================================
// ENUMS E TIPOS BASE
// ============================================================

/**
 * Validação de período BSC (trimestral, semestral, anual)
 */
export const bscPeriodSchema = z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'ANNUAL'], {
  message: 'Período BSC inválido. Use Q1-Q4, H1-H2 ou ANNUAL'
});

/**
 * Perspectiva BSC
 */
export const bscPerspectiveSchema = z.enum([
  'FINANCIAL',
  'CUSTOMER',
  'INTERNAL_PROCESS',
  'LEARNING_GROWTH'
], {
  message: 'Perspectiva BSC inválida'
});

/**
 * Status de meta/objetivo
 */
export const goalStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ON_TRACK',
  'AT_RISK',
  'BEHIND',
  'COMPLETED',
  'CANCELLED'
], {
  message: 'Status de meta inválido'
});

/**
 * Fase PDCA
 */
export const pdcaPhaseSchema = z.enum(['PLAN', 'DO', 'CHECK', 'ACT'], {
  message: 'Fase PDCA inválida. Use PLAN, DO, CHECK ou ACT'
});

/**
 * Status de plano de ação
 */
export const actionPlanStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'BLOCKED'
], {
  message: 'Status de plano de ação inválido'
});

/**
 * Prioridade
 */
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
  message: 'Prioridade inválida'
});

/**
 * Frequência de medição
 */
export const measurementFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL'
], {
  message: 'Frequência de medição inválida'
});

// ============================================================
// SCHEMAS DE CRIAÇÃO (POST)
// ============================================================

/**
 * Schema base para estratégia (sem validação cross-field)
 */
const createStrategySchemaBase = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200).trim(),
  description: z.string().max(2000).optional(),
  vision: z.string().max(1000).optional(),
  mission: z.string().max(1000).optional(),
  startDate: z.string().datetime({ message: 'Data inicial inválida (ISO 8601)' }),
  endDate: z.string().datetime({ message: 'Data final inválida (ISO 8601)' }),
});

/**
 * Schema para criar estratégia (com validação cross-field)
 */
export const createStrategySchema = createStrategySchemaBase.refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Data inicial deve ser anterior à data final', path: ['startDate'] }
);

/**
 * Schema para criar meta/objetivo
 */
export const createGoalSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  strategyId: z.string().uuid('ID da estratégia inválido'),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  perspective: bscPerspectiveSchema,
  targetValue: z.number().positive('Valor alvo deve ser positivo'),
  unit: z.string().min(1).max(20), // %, R$, unidades, etc
  weight: z.number().min(0).max(100).default(1),
  parentId: z.string().uuid().optional().nullable(),
  responsibleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime({ message: 'Data limite inválida (ISO 8601)' }),
});

/**
 * Schema para criar KPI
 */
export const createKpiSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  goalId: z.string().uuid('ID da meta inválido'),
  name: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).optional(),
  formula: z.string().max(500).optional(),
  unit: z.string().min(1).max(20),
  targetValue: z.number(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  frequency: measurementFrequencySchema,
  dataSource: z.string().max(200).optional(),
});

/**
 * Schema base para plano de ação (sem validação cross-field)
 */
const createActionPlanSchemaBase = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  goalId: z.string().uuid('ID da meta inválido').optional(),
  kpiId: z.string().uuid('ID do KPI inválido').optional(),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  responsibleId: z.string().uuid('ID do responsável inválido'),
  priority: prioritySchema.default('MEDIUM'),
  startDate: z.string().datetime({ message: 'Data inicial inválida' }),
  dueDate: z.string().datetime({ message: 'Data limite inválida' }),
  estimatedCost: z.number().nonnegative().optional(),
  estimatedHours: z.number().nonnegative().optional(),
});

/**
 * Schema para criar plano de ação (com validação cross-field)
 */
export const createActionPlanSchema = createActionPlanSchemaBase
  .refine(
    (data) => data.goalId || data.kpiId,
    { message: 'Informe goalId ou kpiId', path: ['goalId'] }
  )
  .refine(
    (data) => new Date(data.startDate) < new Date(data.dueDate),
    { message: 'Data inicial deve ser anterior à data limite', path: ['startDate'] }
  );

/**
 * Schema para ciclo PDCA
 */
export const createPdcaCycleSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  goalId: z.string().uuid().optional(),
  actionPlanId: z.string().uuid().optional(),
  targetValue: z.number().optional(),
  responsibleId: z.string().uuid().optional(),
  plannedStartDate: z.string().datetime().optional(),
  plannedEndDate: z.string().datetime().optional(),
});

/**
 * Schema para criar OKR
 */
export const createOkrSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  ownerId: z.string().uuid('ID do responsável inválido'),
  parentId: z.string().uuid().optional(),
  quarter: bscPeriodSchema,
  year: z.number().int().min(2020).max(2099),
});

/**
 * Schema para criar Key Result
 */
export const createKeyResultSchema = z.object({
  okrId: z.string().uuid('ID do OKR inválido'),
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1).max(20),
  startValue: z.number(),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  weight: z.number().min(0).max(100).default(1),
});

// ============================================================
// SCHEMAS DE ATUALIZAÇÃO (PUT/PATCH)
// ============================================================

/**
 * Schema para atualizar estratégia (campos opcionais + validação condicional)
 */
export const updateStrategySchema = createStrategySchemaBase
  .partial()
  .omit({ organizationId: true, branchId: true })
  .refine(
    (data) => {
      // Validar apenas se ambos os campos existem (após .partial())
      if (data.startDate !== undefined && data.endDate !== undefined) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true; // Se não existe, validação passa
    },
    { message: 'Data inicial deve ser anterior à data final', path: ['startDate'] }
  );

/**
 * Schema para atualizar meta
 */
export const updateGoalSchema = createGoalSchema.partial().omit({ organizationId: true, branchId: true });

/**
 * Schema para atualizar KPI
 */
export const updateKpiSchema = createKpiSchema.partial().omit({ organizationId: true, branchId: true });

/**
 * Schema para atualizar plano de ação (campos opcionais + validação condicional)
 * Nota: Validação goalId/kpiId é obrigatória apenas no CREATE
 */
export const updateActionPlanSchema = createActionPlanSchemaBase
  .partial()
  .omit({ organizationId: true, branchId: true })
  .refine(
    (data) => {
      // Validar apenas se ambos os campos existem (após .partial())
      if (data.startDate !== undefined && data.dueDate !== undefined) {
        return new Date(data.startDate) < new Date(data.dueDate);
      }
      return true; // Se não existe, validação passa
    },
    { message: 'Data inicial deve ser anterior à data limite', path: ['startDate'] }
  );

// ============================================================
// SCHEMAS DE QUERY (GET com filtros)
// ============================================================

/**
 * Schema para query de metas
 */
export const queryGoalsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: goalStatusSchema.optional(),
  perspective: bscPerspectiveSchema.optional(),
  strategyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * Schema para query de KPIs
 */
export const queryKpisSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  goalId: z.string().uuid().optional(),
  frequency: measurementFrequencySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * Schema para query de planos de ação
 */
export const queryActionPlansSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: actionPlanStatusSchema.optional(),
  priority: prioritySchema.optional(),
  goalId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

// ============================================================
// TYPES EXPORTADOS
// ============================================================

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateKpiInput = z.infer<typeof createKpiSchema>;
export type CreateActionPlanInput = z.infer<typeof createActionPlanSchema>;
export type CreatePdcaCycleInput = z.infer<typeof createPdcaCycleSchema>;
export type CreateOkrInput = z.infer<typeof createOkrSchema>;
export type CreateKeyResultInput = z.infer<typeof createKeyResultSchema>;

export type QueryGoalsInput = z.infer<typeof queryGoalsSchema>;
export type QueryKpisInput = z.infer<typeof queryKpisSchema>;
export type QueryActionPlansInput = z.infer<typeof queryActionPlansSchema>;
