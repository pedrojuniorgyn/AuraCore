/**
 * DTO: AdvancePdcaPhase (Avanço de Fase PDCA)
 * 
 * Schema Zod para validação de transição de fase no ciclo PDCA.
 * Implementa a máquina de estados: PLAN → DO → CHECK → ACT
 * 
 * @module strategic/application/dtos
 * @see ADR-0020 - Strategic Management Module
 */

import { z } from 'zod';
import { PdcaPhaseSchema, type PdcaPhaseType } from './CreatePdcaCycleDTO';

/**
 * Transições válidas do ciclo PDCA
 * 
 * PLAN → DO (única opção)
 * DO → CHECK (única opção)
 * CHECK → ACT (sucesso) ou CHECK → DO (retrabalho)
 * ACT → (nenhuma, fase final - pode iniciar novo ciclo)
 */
const VALID_TRANSITIONS: Record<PdcaPhaseType, PdcaPhaseType[]> = {
  'PLAN': ['DO'],
  'DO': ['CHECK'],
  'CHECK': ['ACT', 'DO'], // CHECK pode voltar para DO se falhou
  'ACT': [], // ACT é final (ou inicia novo ciclo)
};

/**
 * Valida se uma transição de fase é permitida
 */
export function validatePhaseTransition(
  currentPhase: PdcaPhaseType,
  targetPhase: PdcaPhaseType
): { isValid: boolean; error?: string } {
  const allowedTransitions = VALID_TRANSITIONS[currentPhase] || [];
  
  if (!allowedTransitions.includes(targetPhase)) {
    const allowedStr = allowedTransitions.length > 0 
      ? allowedTransitions.join(', ')
      : 'nenhuma (fase final)';
    
    return {
      isValid: false,
      error: `Transição de ${currentPhase} para ${targetPhase} não é permitida. Transições válidas: ${allowedStr}`,
    };
  }
  
  return { isValid: true };
}

/**
 * Verifica se uma fase é retrocesso (indicando retrabalho)
 */
export function isRegressionTransition(
  currentPhase: PdcaPhaseType,
  targetPhase: PdcaPhaseType
): boolean {
  // CHECK → DO é o único retrocesso permitido
  return currentPhase === 'CHECK' && targetPhase === 'DO';
}

/**
 * Schema de validação para avanço de fase PDCA
 */
export const AdvancePdcaPhaseInputSchema = z.object({
  /**
   * ID do ciclo PDCA
   */
  cycleId: z.string().uuid('ID do ciclo inválido'),

  /**
   * Fase de destino
   */
  targetPhase: PdcaPhaseSchema,

  /**
   * Motivo da transição (obrigatório para retrocesso CHECK → DO)
   */
  transitionReason: z.string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),

  /**
   * Resumo da fase que está sendo concluída
   */
  phaseSummary: z.string()
    .max(2000, 'Resumo deve ter no máximo 2000 caracteres')
    .optional(),

  /**
   * Lições aprendidas (recomendado ao completar CHECK ou ACT)
   */
  lessonsLearned: z.string()
    .max(2000, 'Lições aprendidas deve ter no máximo 2000 caracteres')
    .optional(),
});

export type AdvancePdcaPhaseInput = z.infer<typeof AdvancePdcaPhaseInputSchema>;

/**
 * Schema de output após avanço de fase
 */
export const AdvancePdcaPhaseOutputSchema = z.object({
  cycleId: z.string().uuid(),
  previousPhase: PdcaPhaseSchema,
  newPhase: PdcaPhaseSchema,
  isRegression: z.boolean(),
  phaseProgress: z.number(),
  overallProgress: z.number(),
});

export type AdvancePdcaPhaseOutput = z.infer<typeof AdvancePdcaPhaseOutputSchema>;
