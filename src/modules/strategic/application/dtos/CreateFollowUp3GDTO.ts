/**
 * DTO: CreateFollowUp3G
 * Schema Zod para criação de Follow-up 3G (Falconi)
 * 
 * 3G: GEMBA (現場) / GENBUTSU (現物) / GENJITSU (現実)
 * - GEMBA: Ir ao local (Go to the actual place)
 * - GENBUTSU: Ver o fato real (Observe the actual thing)
 * - GENJITSU: Ser realista (Be realistic about facts)
 * 
 * @module strategic/application/dtos
 * @see action-plan-follow-up.schema.ts
 */
import { z } from 'zod';

// ============================================================================
// VALUE SCHEMAS
// ============================================================================

/**
 * Status de Execução do Follow-up
 */
export const ExecutionStatusSchema = z.enum([
  'EXECUTED_OK',
  'EXECUTED_PARTIAL',
  'NOT_EXECUTED',
  'BLOCKED',
], {
  message: 'Status de execução inválido. Use: EXECUTED_OK, EXECUTED_PARTIAL, NOT_EXECUTED ou BLOCKED',
});

/**
 * Severidade do Problema Observado
 */
export const ProblemSeveritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
], {
  message: 'Severidade do problema inválida. Use: LOW, MEDIUM, HIGH ou CRITICAL',
});

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export type ProblemSeverity = z.infer<typeof ProblemSeveritySchema>;

// ============================================================================
// CREATE FOLLOW-UP 3G
// ============================================================================

/**
 * Schema para criação de Follow-up 3G
 * 
 * Campos obrigatórios (alinhados ao schema do banco):
 * - actionPlanId, followUpDate, gembaLocal, gembutsuObservation, genjitsuData
 * - executionStatus, executionPercent, verifiedBy
 * 
 * Regras de negócio:
 * - GEMBA (onde verificou) é sempre obrigatório
 * - GENBUTSU (o que observou) é sempre obrigatório
 * - GENJITSU (dados coletados) é sempre obrigatório
 * - Se NOT_EXECUTED, deve informar problema
 * - Se requiresNewPlan, deve ter newPlanDescription
 */
export const CreateFollowUp3GInputSchema = z.object({
  // Vínculo obrigatório com Plano de Ação
  actionPlanId: z.string().uuid('ID do plano de ação inválido'),
  
  // Data do Follow-up
  followUpDate: z.coerce.date({
    message: 'Data do follow-up é obrigatória',
  }),
  
  // =========================================================================
  // 3G - OS 3 CAMPOS FUNDAMENTAIS
  // =========================================================================
  
  // GEMBA (現場) - ONDE verificou
  gembaLocal: z.string()
    .min(1, 'GEMBA (local da verificação) é obrigatório')
    .max(500, 'GEMBA deve ter no máximo 500 caracteres'),
  
  // GENBUTSU (現物) - O QUE observou
  gembutsuObservation: z.string()
    .min(1, 'GENBUTSU (observação do fato) é obrigatório')
    .max(5000, 'GENBUTSU deve ter no máximo 5000 caracteres'),
  
  // GENJITSU (現実) - DADOS coletados
  genjitsuData: z.string()
    .min(1, 'GENJITSU (dados coletados) é obrigatório')
    .max(5000, 'GENJITSU deve ter no máximo 5000 caracteres'),
  
  // =========================================================================
  // RESULTADO DA VERIFICAÇÃO
  // =========================================================================
  
  // Status de execução
  executionStatus: ExecutionStatusSchema,
  
  // Percentual de execução (0-100)
  executionPercent: z.number()
    .min(0, 'Percentual de execução mínimo é 0%')
    .max(100, 'Percentual de execução máximo é 100%'),
  
  // Problemas observados
  problemsObserved: z.string().max(5000).optional(),
  problemSeverity: ProblemSeveritySchema.optional(),
  
  // =========================================================================
  // REPROPOSIÇÃO (Máximo 3 - ADR-0022)
  // =========================================================================
  
  // Requer novo plano de ação?
  requiresNewPlan: z.boolean().default(false),
  
  // Descrição do novo plano (obrigatório se requiresNewPlan)
  newPlanDescription: z.string().max(2000).optional(),
  
  // Responsável pelo novo plano
  newPlanAssignedTo: z.string().uuid().optional(),
  
  // =========================================================================
  // AUDITORIA
  // =========================================================================
  
  // Quem verificou
  verifiedBy: z.string().uuid('ID do verificador é obrigatório'),
  
  // Evidências (URLs de fotos, documentos)
  evidenceUrls: z.array(z.string().url('URL de evidência inválida')).optional(),
  
}).refine(
  (data) => {
    // NOT_EXECUTED ou BLOCKED deve ter problema informado
    if (data.executionStatus === 'NOT_EXECUTED' || data.executionStatus === 'BLOCKED') {
      return data.problemsObserved && data.problemsObserved.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Quando status é NOT_EXECUTED ou BLOCKED, problemas observados são obrigatórios',
    path: ['problemsObserved'],
  }
).refine(
  (data) => {
    // Se executionStatus é NOT_EXECUTED/BLOCKED, deve ter severidade
    if (data.executionStatus === 'NOT_EXECUTED' || data.executionStatus === 'BLOCKED') {
      return data.problemSeverity !== undefined;
    }
    return true;
  },
  {
    message: 'Quando status é NOT_EXECUTED ou BLOCKED, severidade do problema é obrigatória',
    path: ['problemSeverity'],
  }
).refine(
  (data) => {
    // Se requiresNewPlan, deve ter descrição
    if (data.requiresNewPlan) {
      return data.newPlanDescription && data.newPlanDescription.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Quando requer novo plano, a descrição do novo plano é obrigatória',
    path: ['newPlanDescription'],
  }
).refine(
  (data) => {
    // EXECUTED_OK deve ter executionPercent >= 80
    if (data.executionStatus === 'EXECUTED_OK') {
      return data.executionPercent >= 80;
    }
    return true;
  },
  {
    message: 'Status EXECUTED_OK requer percentual de execução >= 80%',
    path: ['executionPercent'],
  }
).refine(
  (data) => {
    // EXECUTED_PARTIAL deve ter executionPercent entre 1 e 99
    if (data.executionStatus === 'EXECUTED_PARTIAL') {
      return data.executionPercent > 0 && data.executionPercent < 100;
    }
    return true;
  },
  {
    message: 'Status EXECUTED_PARTIAL requer percentual de execução entre 1% e 99%',
    path: ['executionPercent'],
  }
).refine(
  (data) => {
    // NOT_EXECUTED deve ter executionPercent = 0
    if (data.executionStatus === 'NOT_EXECUTED') {
      return data.executionPercent === 0;
    }
    return true;
  },
  {
    message: 'Status NOT_EXECUTED requer percentual de execução = 0%',
    path: ['executionPercent'],
  }
);

export type CreateFollowUp3GInputDto = z.infer<typeof CreateFollowUp3GInputSchema>;

// ============================================================================
// HELPER: Validar 3G Completo
// ============================================================================

/**
 * Verifica se todos os campos 3G obrigatórios estão preenchidos
 */
export function validate3GComplete(data: CreateFollowUp3GInputDto): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!data.gembaLocal?.trim()) missingFields.push('GEMBA (Local da verificação)');
  if (!data.gembutsuObservation?.trim()) missingFields.push('GENBUTSU (Observação do fato)');
  if (!data.genjitsuData?.trim()) missingFields.push('GENJITSU (Dados coletados)');
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
