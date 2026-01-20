/**
 * Contract Tests: War Room Dashboard
 * 
 * Testes de contrato para WarRoomFiltersDTO e WarRoomOutputDTO
 * 
 * @module tests/contract/strategic
 */
import { describe, it, expect } from 'vitest';
import {
  WarRoomFiltersInputSchema,
  WarRoomOutputSchema,
  BscPerspectiveSchema,
  KpiTrendSchema,
  calculateHealthScore,
} from '@/modules/strategic/application/dtos/WarRoomDTO';

describe('WarRoom Contract', () => {
  // ==========================================================================
  // WarRoomFilters - VALID CASES
  // ==========================================================================
  describe('WarRoomFilters - Valid inputs', () => {
    it('should accept empty filters (defaults)', () => {
      const result = WarRoomFiltersInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeOverdueOnly).toBe(false);
        expect(result.data.includeCriticalKpisOnly).toBe(false);
        expect(result.data.maxOverdueActions).toBe(10);
        expect(result.data.maxCriticalKpis).toBe(10);
      }
    });

    it('should accept date range filter', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept perspective filter', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        perspectives: ['FINANCIAL', 'CUSTOMER'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all perspectives', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        perspectives: ['FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept single perspective', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        perspectives: ['FINANCIAL'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept overdue only flag', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        includeOverdueOnly: true,
        maxOverdueActions: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should accept critical KPIs only flag', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        includeCriticalKpisOnly: true,
        maxCriticalKpis: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should accept objective IDs filter', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        objectiveIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept owner IDs filter', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        ownerIds: [
          '123e4567-e89b-12d3-a456-426614174002',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });

    it('should accept same day dates', () => {
      const today = new Date();
      const result = WarRoomFiltersInputSchema.safeParse({
        startDate: today,
        endDate: today,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // WarRoomFilters - INVALID CASES
  // ==========================================================================
  describe('WarRoomFilters - Invalid inputs', () => {
    it('should reject invalid perspective', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        perspectives: ['FINANCIAL', 'INVALID'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject endDate before startDate', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        startDate: new Date('2026-12-31'),
        endDate: new Date('2026-01-01'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('endDate');
      }
    });

    it('should reject invalid objective UUID', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        objectiveIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid owner UUID', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        ownerIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive maxOverdueActions', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        maxOverdueActions: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative maxOverdueActions', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        maxOverdueActions: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive maxCriticalKpis', () => {
      const result = WarRoomFiltersInputSchema.safeParse({
        maxCriticalKpis: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // WarRoomOutput - VALID CASES
  // ==========================================================================
  describe('WarRoomOutput - Valid outputs', () => {
    const validOutput = {
      bscSummary: [{
        perspective: 'FINANCIAL',
        totalObjectives: 5,
        achievedObjectives: 2,
        inProgressObjectives: 3,
        avgProgress: 60,
        kpisOnTarget: 4,
        kpisOffTarget: 1,
      }],
      criticalKpis: [{
        id: '123',
        code: 'KPI-001',
        name: 'Receita Mensal',
        objectiveName: 'Aumentar Receita',
        perspective: 'FINANCIAL',
        currentValue: 800000,
        targetValue: 1000000,
        unit: 'BRL',
        variancePercent: -20,
        trend: 'DOWN' as const,
        lastMeasurementDate: new Date(),
      }],
      overdueActions: [{
        id: '456',
        code: 'AP-001',
        what: 'Implementar CRM',
        deadline: new Date('2025-12-01'),
        daysOverdue: 50,
        ownerName: 'João',
        priority: 'HIGH',
        linkedTo: 'BSC: Melhorar Atendimento',
      }],
      activePdcaCycles: [{
        id: '789',
        code: 'PDCA-001',
        title: 'Otimização de Processos',
        currentPhase: 'DO',
        overallProgress: 45,
        daysInCurrentPhase: 10,
        ownerName: 'Maria',
      }],
      swotSummary: {
        strengths: 5,
        weaknesses: 3,
        opportunities: 4,
        threats: 2,
        highImpactItems: 6,
        itemsWithoutActions: 2,
      },
      metrics: {
        totalObjectives: 15,
        achievedObjectives: 5,
        objectivesAtRisk: 2,
        totalKpis: 30,
        kpisOnTarget: 22,
        kpisBelowTarget: 6,
        kpisAboveTarget: 2,
        totalActions: 50,
        completedActions: 20,
        inProgressActions: 25,
        overdueActions: 5,
        activePdcaCycles: 3,
        completedPdcaCycles: 7,
      },
      healthScore: 0.75,
      generatedAt: new Date(),
    };

    it('should validate complete output structure', () => {
      const result = WarRoomOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should accept empty arrays', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        criticalKpis: [],
        overdueActions: [],
        activePdcaCycles: [],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null ownerName', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        overdueActions: [{
          ...validOutput.overdueActions[0],
          ownerName: null,
        }],
        activePdcaCycles: [{
          ...validOutput.activePdcaCycles[0],
          ownerName: null,
        }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null linkedTo', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        overdueActions: [{
          ...validOutput.overdueActions[0],
          linkedTo: null,
        }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null lastMeasurementDate', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        criticalKpis: [{
          ...validOutput.criticalKpis[0],
          lastMeasurementDate: null,
        }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all trend types', () => {
      const trends = ['UP', 'DOWN', 'STABLE'] as const;
      for (const trend of trends) {
        const result = WarRoomOutputSchema.safeParse({
          ...validOutput,
          criticalKpis: [{
            ...validOutput.criticalKpis[0],
            trend,
          }],
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept healthScore at boundaries', () => {
      expect(WarRoomOutputSchema.safeParse({
        ...validOutput,
        healthScore: 0,
      }).success).toBe(true);

      expect(WarRoomOutputSchema.safeParse({
        ...validOutput,
        healthScore: 1,
      }).success).toBe(true);
    });

    it('should accept multiple bscSummary entries', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        bscSummary: [
          { ...validOutput.bscSummary[0], perspective: 'FINANCIAL' },
          { ...validOutput.bscSummary[0], perspective: 'CUSTOMER' },
          { ...validOutput.bscSummary[0], perspective: 'INTERNAL_PROCESS' },
          { ...validOutput.bscSummary[0], perspective: 'LEARNING_GROWTH' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // WarRoomOutput - INVALID CASES
  // ==========================================================================
  describe('WarRoomOutput - Invalid outputs', () => {
    const validOutput = {
      bscSummary: [],
      criticalKpis: [],
      overdueActions: [],
      activePdcaCycles: [],
      swotSummary: {
        strengths: 0,
        weaknesses: 0,
        opportunities: 0,
        threats: 0,
        highImpactItems: 0,
        itemsWithoutActions: 0,
      },
      metrics: {
        totalObjectives: 0,
        achievedObjectives: 0,
        objectivesAtRisk: 0,
        totalKpis: 0,
        kpisOnTarget: 0,
        kpisBelowTarget: 0,
        kpisAboveTarget: 0,
        totalActions: 0,
        completedActions: 0,
        inProgressActions: 0,
        overdueActions: 0,
        activePdcaCycles: 0,
        completedPdcaCycles: 0,
      },
      healthScore: 0.5,
      generatedAt: new Date(),
    };

    it('should reject healthScore > 1', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        healthScore: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative healthScore', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        healthScore: -0.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid trend', () => {
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        criticalKpis: [{
          id: '123',
          code: 'KPI-001',
          name: 'Test',
          objectiveName: 'Test Obj',
          perspective: 'FINANCIAL',
          currentValue: 100,
          targetValue: 200,
          unit: 'BRL',
          variancePercent: -50,
          trend: 'INVALID',
          lastMeasurementDate: null,
        }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields in metrics', () => {
      const { overdueActions: _, ...incompleteMetrics } = validOutput.metrics;
      const result = WarRoomOutputSchema.safeParse({
        ...validOutput,
        metrics: incompleteMetrics,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing swotSummary', () => {
      const { swotSummary: _, ...outputWithoutSwot } = validOutput;
      const result = WarRoomOutputSchema.safeParse(outputWithoutSwot);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Value Schemas
  // ==========================================================================
  describe('Value Schemas', () => {
    it('should validate BscPerspective', () => {
      const validPerspectives = ['FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH'];
      for (const perspective of validPerspectives) {
        expect(BscPerspectiveSchema.safeParse(perspective).success).toBe(true);
      }
      expect(BscPerspectiveSchema.safeParse('INNOVATION').success).toBe(false);
    });

    it('should validate KpiTrend', () => {
      const validTrends = ['UP', 'DOWN', 'STABLE'];
      for (const trend of validTrends) {
        expect(KpiTrendSchema.safeParse(trend).success).toBe(true);
      }
      expect(KpiTrendSchema.safeParse('SIDEWAYS').success).toBe(false);
    });
  });

  // ==========================================================================
  // Helper: calculateHealthScore
  // ==========================================================================
  describe('Helper: calculateHealthScore', () => {
    it('should return 1.0 for perfect metrics', () => {
      const metrics = {
        totalObjectives: 10,
        achievedObjectives: 10,
        objectivesAtRisk: 0,
        totalKpis: 20,
        kpisOnTarget: 20,
        kpisBelowTarget: 0,
        kpisAboveTarget: 0,
        totalActions: 30,
        completedActions: 30,
        inProgressActions: 0,
        overdueActions: 0,
        activePdcaCycles: 0,
        completedPdcaCycles: 10,
      };
      expect(calculateHealthScore(metrics)).toBe(1);
    });

    it('should return lower score for poor metrics', () => {
      const metrics = {
        totalObjectives: 10,
        achievedObjectives: 2,
        objectivesAtRisk: 5,
        totalKpis: 20,
        kpisOnTarget: 5,
        kpisBelowTarget: 15,
        kpisAboveTarget: 0,
        totalActions: 30,
        completedActions: 5,
        inProgressActions: 10,
        overdueActions: 15,
        activePdcaCycles: 5,
        completedPdcaCycles: 2,
      };
      const score = calculateHealthScore(metrics);
      expect(score).toBeLessThan(0.5);
    });

    it('should handle zero totals gracefully', () => {
      const metrics = {
        totalObjectives: 0,
        achievedObjectives: 0,
        objectivesAtRisk: 0,
        totalKpis: 0,
        kpisOnTarget: 0,
        kpisBelowTarget: 0,
        kpisAboveTarget: 0,
        totalActions: 0,
        completedActions: 0,
        inProgressActions: 0,
        overdueActions: 0,
        activePdcaCycles: 0,
        completedPdcaCycles: 0,
      };
      const score = calculateHealthScore(metrics);
      expect(score).toBe(1); // Neutro quando não há dados
    });

    it('should calculate weighted score correctly', () => {
      const metrics = {
        totalObjectives: 10,
        achievedObjectives: 5, // 50% -> contribui 0.15 (30% * 0.5)
        objectivesAtRisk: 2,
        totalKpis: 10,
        kpisOnTarget: 8, // 80% -> contribui 0.32 (40% * 0.8)
        kpisBelowTarget: 2,
        kpisAboveTarget: 0,
        totalActions: 10,
        completedActions: 3,
        inProgressActions: 5,
        overdueActions: 2, // 80% not overdue -> contribui 0.16 (20% * 0.8)
        activePdcaCycles: 5,
        completedPdcaCycles: 5, // 50% completed -> contribui 0.05 (10% * 0.5)
      };
      const score = calculateHealthScore(metrics);
      // Expected: 0.15 + 0.32 + 0.16 + 0.05 = 0.68
      expect(score).toBeCloseTo(0.68, 1);
    });
  });
});
