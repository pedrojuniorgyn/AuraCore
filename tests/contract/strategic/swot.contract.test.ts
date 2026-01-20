/**
 * Contract Tests: SWOT Analysis
 * 
 * Testes de contrato para CreateSwotItemDTO e UpdateSwotItemDTO
 * 
 * SWOT: Strengths, Weaknesses, Opportunities, Threats
 * 
 * @module tests/contract/strategic
 */
import { describe, it, expect } from 'vitest';
import {
  CreateSwotItemInputSchema,
  UpdateSwotItemInputSchema,
  SwotQuadrantSchema,
  SwotStatusSchema,
  SwotCategorySchema,
  isExternalFactor,
  isInternalFactor,
  calculatePriorityScore,
} from '@/modules/strategic/application/dtos/CreateSwotItemDTO';

describe('SWOT Contract', () => {
  const validStrategyId = '123e4567-e89b-12d3-a456-426614174000';
  const validSwotItemId = '123e4567-e89b-12d3-a456-426614174001';

  // ==========================================================================
  // STRENGTHS (Forças - Interno Positivo)
  // ==========================================================================
  describe('Strengths (Forças)', () => {
    it('should accept valid strength', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Equipe técnica altamente qualificada',
        description: 'Time com certificações e experiência em projetos complexos',
        impactScore: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should not require probability for strength', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Marca reconhecida no mercado',
        impactScore: 4,
        // probabilityScore not required for S
      });
      expect(result.success).toBe(true);
    });

    it('should accept strength with category', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Infraestrutura de TI moderna',
        impactScore: 4,
        category: 'TECHNOLOGY',
      });
      expect(result.success).toBe(true);
    });

    it('should accept strength with optional probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Liderança experiente',
        impactScore: 5,
        probabilityScore: 3, // Optional but allowed
      });
      expect(result.success).toBe(true);
    });

    it('should apply default status IDENTIFIED', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Cultura organizacional forte',
        impactScore: 4,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('IDENTIFIED');
      }
    });
  });

  // ==========================================================================
  // WEAKNESSES (Fraquezas - Interno Negativo)
  // ==========================================================================
  describe('Weaknesses (Fraquezas)', () => {
    it('should accept valid weakness', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'WEAKNESS',
        title: 'Sistema legado com manutenção cara',
        description: 'ERP antigo gerando custos de R$ 50k/mês',
        impactScore: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should not require probability for weakness', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'WEAKNESS',
        title: 'Baixa presença digital',
        impactScore: 3,
        // probabilityScore not required for W
      });
      expect(result.success).toBe(true);
    });

    it('should accept weakness with strategy link', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'WEAKNESS',
        title: 'Alta rotatividade de pessoal',
        impactScore: 4,
        strategyId: validStrategyId,
        category: 'PEOPLE',
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // OPPORTUNITIES (Oportunidades - Externo Positivo)
  // ==========================================================================
  describe('Opportunities (Oportunidades)', () => {
    it('should accept valid opportunity with probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'OPPORTUNITY',
        title: 'Expansão para mercado internacional',
        description: 'Demanda identificada na América Latina',
        impactScore: 5,
        probabilityScore: 3,
      });
      expect(result.success).toBe(true);
    });

    it('should reject opportunity without probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'OPPORTUNITY',
        title: 'Nova linha de produtos',
        impactScore: 4,
        // probabilityScore missing - required for O
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('probabilityScore');
      }
    });

    it('should accept opportunity with all scores', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'OPPORTUNITY',
        title: 'Parceria estratégica com fornecedor',
        impactScore: 4,
        probabilityScore: 4,
        category: 'MARKET',
      });
      expect(result.success).toBe(true);
    });

    it('should accept opportunity with low probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'OPPORTUNITY',
        title: 'Aquisição de concorrente',
        impactScore: 5,
        probabilityScore: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // THREATS (Ameaças - Externo Negativo)
  // ==========================================================================
  describe('Threats (Ameaças)', () => {
    it('should accept valid threat with probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'THREAT',
        title: 'Entrada de concorrente internacional',
        description: 'Empresa X anunciou planos de entrar no Brasil',
        impactScore: 5,
        probabilityScore: 4,
      });
      expect(result.success).toBe(true);
    });

    it('should reject threat without probability', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'THREAT',
        title: 'Mudança regulatória',
        impactScore: 4,
        // probabilityScore missing
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('probabilityScore');
      }
    });

    it('should accept threat with category REGULATORY', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'THREAT',
        title: 'Nova legislação tributária',
        impactScore: 4,
        probabilityScore: 5,
        category: 'REGULATORY',
      });
      expect(result.success).toBe(true);
    });

    it('should accept threat with category COMPETITIVE', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'THREAT',
        title: 'Guerra de preços no setor',
        impactScore: 3,
        probabilityScore: 3,
        category: 'COMPETITIVE',
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // INVALID CASES - Title and Description
  // ==========================================================================
  describe('Invalid title and description', () => {
    it('should reject empty title', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: '',
        impactScore: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 chars', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'A'.repeat(201),
        impactScore: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 2000 chars', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Valid title',
        description: 'A'.repeat(2001),
        impactScore: 3,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // INVALID CASES - Scores
  // ==========================================================================
  describe('Invalid scores', () => {
    it('should reject impactScore < 1', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Valid title',
        impactScore: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject impactScore > 5', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Valid title',
        impactScore: 6,
      });
      expect(result.success).toBe(false);
    });

    it('should reject probabilityScore < 1', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'OPPORTUNITY',
        title: 'Valid title',
        impactScore: 3,
        probabilityScore: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject probabilityScore > 5', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'THREAT',
        title: 'Valid title',
        impactScore: 3,
        probabilityScore: 6,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // INVALID CASES - Quadrant and Category
  // ==========================================================================
  describe('Invalid quadrant and category', () => {
    it('should reject invalid quadrant', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'RISK',
        title: 'Valid title',
        impactScore: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid category', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Valid title',
        impactScore: 3,
        category: 'INVALID_CATEGORY',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // INVALID CASES - IDs
  // ==========================================================================
  describe('Invalid IDs', () => {
    it('should reject invalid strategyId', () => {
      const result = CreateSwotItemInputSchema.safeParse({
        quadrant: 'STRENGTH',
        title: 'Valid title',
        impactScore: 3,
        strategyId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // UpdateSwotItem
  // ==========================================================================
  describe('UpdateSwotItem', () => {
    it('should accept partial update', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: validSwotItemId,
        status: 'ANALYZING',
      });
      expect(result.success).toBe(true);
    });

    it('should accept score updates', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: validSwotItemId,
        impactScore: 4,
        probabilityScore: 3,
      });
      expect(result.success).toBe(true);
    });

    it('should accept conversion to action plan', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: validSwotItemId,
        status: 'ACTION_DEFINED',
        convertedToActionPlanId: '123e4567-e89b-12d3-a456-426614174002',
      });
      expect(result.success).toBe(true);
    });

    it('should accept conversion to goal', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: validSwotItemId,
        status: 'ACTION_DEFINED',
        convertedToGoalId: '123e4567-e89b-12d3-a456-426614174003',
      });
      expect(result.success).toBe(true);
    });

    it('should accept nullable fields', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: validSwotItemId,
        description: null,
        probabilityScore: null,
        convertedToActionPlanId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing swotItemId', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        status: 'RESOLVED',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid swotItemId', () => {
      const result = UpdateSwotItemInputSchema.safeParse({
        swotItemId: 'not-a-uuid',
        status: 'RESOLVED',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all statuses', () => {
      const statuses = ['IDENTIFIED', 'ANALYZING', 'ACTION_DEFINED', 'MONITORING', 'RESOLVED'] as const;
      for (const status of statuses) {
        const result = UpdateSwotItemInputSchema.safeParse({
          swotItemId: validSwotItemId,
          status,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Value Schemas
  // ==========================================================================
  describe('Value Schemas', () => {
    it('should validate SwotQuadrant', () => {
      const validQuadrants = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'];
      for (const quadrant of validQuadrants) {
        expect(SwotQuadrantSchema.safeParse(quadrant).success).toBe(true);
      }
      expect(SwotQuadrantSchema.safeParse('RISK').success).toBe(false);
    });

    it('should validate SwotStatus', () => {
      const validStatuses = ['IDENTIFIED', 'ANALYZING', 'ACTION_DEFINED', 'MONITORING', 'RESOLVED'];
      for (const status of validStatuses) {
        expect(SwotStatusSchema.safeParse(status).success).toBe(true);
      }
      expect(SwotStatusSchema.safeParse('PENDING').success).toBe(false);
    });

    it('should validate SwotCategory', () => {
      const validCategories = ['MARKET', 'TECHNOLOGY', 'FINANCIAL', 'OPERATIONAL', 'PEOPLE', 'REGULATORY', 'COMPETITIVE', 'INFRASTRUCTURE', 'OTHER'];
      for (const category of validCategories) {
        expect(SwotCategorySchema.safeParse(category).success).toBe(true);
      }
      expect(SwotCategorySchema.safeParse('UNKNOWN').success).toBe(false);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  describe('Helper Functions', () => {
    describe('isExternalFactor', () => {
      it('should return true for OPPORTUNITY', () => {
        expect(isExternalFactor('OPPORTUNITY')).toBe(true);
      });

      it('should return true for THREAT', () => {
        expect(isExternalFactor('THREAT')).toBe(true);
      });

      it('should return false for STRENGTH', () => {
        expect(isExternalFactor('STRENGTH')).toBe(false);
      });

      it('should return false for WEAKNESS', () => {
        expect(isExternalFactor('WEAKNESS')).toBe(false);
      });
    });

    describe('isInternalFactor', () => {
      it('should return true for STRENGTH', () => {
        expect(isInternalFactor('STRENGTH')).toBe(true);
      });

      it('should return true for WEAKNESS', () => {
        expect(isInternalFactor('WEAKNESS')).toBe(true);
      });

      it('should return false for OPPORTUNITY', () => {
        expect(isInternalFactor('OPPORTUNITY')).toBe(false);
      });

      it('should return false for THREAT', () => {
        expect(isInternalFactor('THREAT')).toBe(false);
      });
    });

    describe('calculatePriorityScore', () => {
      it('should calculate impact * probability for external factors', () => {
        expect(calculatePriorityScore('OPPORTUNITY', 5, 4)).toBe(20);
        expect(calculatePriorityScore('THREAT', 3, 3)).toBe(9);
      });

      it('should calculate impact * 3 for internal factors', () => {
        expect(calculatePriorityScore('STRENGTH', 5)).toBe(15);
        expect(calculatePriorityScore('WEAKNESS', 4)).toBe(12);
      });

      it('should handle edge cases', () => {
        expect(calculatePriorityScore('OPPORTUNITY', 1, 1)).toBe(1);
        expect(calculatePriorityScore('THREAT', 5, 5)).toBe(25);
        expect(calculatePriorityScore('STRENGTH', 1)).toBe(3);
      });
    });
  });
});
