/**
 * Testes de Contrato - AdvancePdcaPhase DTO
 * 
 * Valida o schema Zod para transição de fases no ciclo PDCA,
 * incluindo a máquina de estados: PLAN → DO → CHECK → ACT
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.2 - Ciclos PDCA
 */

import { describe, it, expect } from 'vitest';
import { 
  AdvancePdcaPhaseInputSchema, 
  validatePhaseTransition,
  isRegressionTransition,
} from '@/modules/strategic/application/dtos/AdvancePdcaPhaseDTO';

describe('AdvancePdcaPhase Contract', () => {
  // Fixtures
  const validCycleId = '123e4567-e89b-12d3-a456-426614174000';

  // =========================================================================
  // ✅ VALIDAÇÃO DE SCHEMA
  // =========================================================================

  describe('Schema Validation', () => {
    it('should accept valid advance request', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'DO',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid phases as target', () => {
      const phases = ['PLAN', 'DO', 'CHECK', 'ACT'];
      for (const phase of phases) {
        const result = AdvancePdcaPhaseInputSchema.safeParse({
          cycleId: validCycleId,
          targetPhase: phase,
        });
        expect(result.success, `Phase ${phase} should be valid`).toBe(true);
      }
    });

    it('should accept with all optional fields', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'CHECK',
        transitionReason: 'Implementação concluída com sucesso',
        phaseSummary: 'Todas as ações do DO foram executadas conforme planejado',
        lessonsLearned: 'Necessário mais treinamento da equipe em processos',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phase', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid cycleId', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: 'not-a-uuid',
        targetPhase: 'DO',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing cycleId', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        targetPhase: 'DO',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing targetPhase', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
      });
      expect(result.success).toBe(false);
    });

    it('should reject transitionReason longer than 500 chars', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'DO',
        transitionReason: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject phaseSummary longer than 2000 chars', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'CHECK',
        phaseSummary: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject lessonsLearned longer than 2000 chars', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'ACT',
        lessonsLearned: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ✅ TRANSIÇÕES VÁLIDAS
  // =========================================================================

  describe('Transições Válidas', () => {
    it('should allow PLAN → DO', () => {
      const result = validatePhaseTransition('PLAN', 'DO');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow DO → CHECK', () => {
      const result = validatePhaseTransition('DO', 'CHECK');
      expect(result.isValid).toBe(true);
    });

    it('should allow CHECK → ACT (sucesso)', () => {
      const result = validatePhaseTransition('CHECK', 'ACT');
      expect(result.isValid).toBe(true);
    });

    it('should allow CHECK → DO (retrabalho)', () => {
      const result = validatePhaseTransition('CHECK', 'DO');
      expect(result.isValid).toBe(true);
    });
  });

  // =========================================================================
  // ❌ TRANSIÇÕES INVÁLIDAS
  // =========================================================================

  describe('Transições Inválidas', () => {
    it('should reject PLAN → CHECK (pular fase)', () => {
      const result = validatePhaseTransition('PLAN', 'CHECK');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('não é permitida');
      expect(result.error).toContain('DO');
    });

    it('should reject PLAN → ACT (pular fases)', () => {
      const result = validatePhaseTransition('PLAN', 'ACT');
      expect(result.isValid).toBe(false);
    });

    it('should reject DO → PLAN (retrocesso inválido)', () => {
      const result = validatePhaseTransition('DO', 'PLAN');
      expect(result.isValid).toBe(false);
    });

    it('should reject DO → ACT (pular fase)', () => {
      const result = validatePhaseTransition('DO', 'ACT');
      expect(result.isValid).toBe(false);
    });

    it('should reject CHECK → PLAN (retrocesso inválido)', () => {
      const result = validatePhaseTransition('CHECK', 'PLAN');
      expect(result.isValid).toBe(false);
    });

    it('should reject ACT → PLAN (fase final)', () => {
      const result = validatePhaseTransition('ACT', 'PLAN');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('nenhuma');
      expect(result.error).toContain('fase final');
    });

    it('should reject ACT → DO (fase final)', () => {
      const result = validatePhaseTransition('ACT', 'DO');
      expect(result.isValid).toBe(false);
    });

    it('should reject ACT → CHECK (fase final)', () => {
      const result = validatePhaseTransition('ACT', 'CHECK');
      expect(result.isValid).toBe(false);
    });

    it('should reject same phase transition', () => {
      expect(validatePhaseTransition('PLAN', 'PLAN').isValid).toBe(false);
      expect(validatePhaseTransition('DO', 'DO').isValid).toBe(false);
      expect(validatePhaseTransition('CHECK', 'CHECK').isValid).toBe(false);
      expect(validatePhaseTransition('ACT', 'ACT').isValid).toBe(false);
    });
  });

  // =========================================================================
  // DETECÇÃO DE RETROCESSO
  // =========================================================================

  describe('Detecção de Retrocesso (Retrabalho)', () => {
    it('should identify CHECK → DO as regression', () => {
      const result = isRegressionTransition('CHECK', 'DO');
      expect(result).toBe(true);
    });

    it('should not identify PLAN → DO as regression', () => {
      const result = isRegressionTransition('PLAN', 'DO');
      expect(result).toBe(false);
    });

    it('should not identify DO → CHECK as regression', () => {
      const result = isRegressionTransition('DO', 'CHECK');
      expect(result).toBe(false);
    });

    it('should not identify CHECK → ACT as regression', () => {
      const result = isRegressionTransition('CHECK', 'ACT');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle empty strings for optional fields', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'DO',
        transitionReason: '',
        phaseSummary: '',
        lessonsLearned: '',
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in reason', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'CHECK',
        transitionReason: 'Concluído: 100% das tarefas (5/5) — aprovado pelo gestor',
      });
      expect(result.success).toBe(true);
    });

    it('should handle multiline phaseSummary', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'ACT',
        phaseSummary: `Resumo da fase:
- Item 1: Concluído
- Item 2: Concluído
- Item 3: Parcial

Observações finais.`,
      });
      expect(result.success).toBe(true);
    });

    it('should handle fields at maximum length', () => {
      const result = AdvancePdcaPhaseInputSchema.safeParse({
        cycleId: validCycleId,
        targetPhase: 'DO',
        transitionReason: 'A'.repeat(500),
        phaseSummary: 'B'.repeat(2000),
        lessonsLearned: 'C'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });
});
