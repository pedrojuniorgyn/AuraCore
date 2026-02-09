import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService, type PartialAlertConfig } from '@/modules/strategic/application/services/AlertService';
import { Result } from '@/shared/domain';
import type { IAlertRepository } from '@/modules/strategic/domain/ports/output/IAlertRepository';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import type { IApprovalPermissionRepository } from '@/modules/strategic/domain/ports/output/IApprovalPermissionRepository';
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';

describe('AlertService', () => {
  let alertService: AlertService;
  let mockAlertRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockKPIRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockActionPlanRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockApprovalPermRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockNotificationService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    // Setup mocks
    mockAlertRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findByEntity: vi.fn().mockResolvedValue(null),
      findPending: vi.fn().mockResolvedValue([]),
    };

    mockKPIRepo = {
      findMany: vi.fn(),
    };

    mockActionPlanRepo = {
      findMany: vi.fn(),
    };

    mockApprovalPermRepo = {
      findApproversByOrg: vi.fn().mockResolvedValue([]),
    };

    mockNotificationService = {
      sendNotification: vi.fn().mockResolvedValue(undefined),
    };

    alertService = new AlertService(
      mockAlertRepo as unknown as IAlertRepository,
      mockKPIRepo as unknown as IKPIRepository,
      mockActionPlanRepo as unknown as IActionPlanRepository,
      mockApprovalPermRepo as unknown as IApprovalPermissionRepository,
      mockNotificationService as unknown as NotificationService
    );
  });

  describe('checkKPIAlerts - Thresholds', () => {
    it('should detect KPI below critical threshold (70%)', async () => {
      // Arrange
      const kpi = createMockKPI({ achievementPercent: 65 });
      mockKPIRepo.findMany.mockResolvedValue({
        items: [kpi],
        total: 1,
      });

      // Act
      const result = await alertService.checkKPIAlerts(1, 1);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].severity).toBe('HIGH'); // 65% > 50%
      expect(result.value[0].currentValue).toBe(65);
      expect(result.value[0].thresholdValue).toBe(70);
    });

    it('should detect CRITICAL severity when < 50%', async () => {
      const kpi = createMockKPI({ achievementPercent: 40 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const result = await alertService.checkKPIAlerts(1, 1);

      expect(result.value[0].severity).toBe('CRITICAL');
    });

    it('should NOT detect KPI above threshold', async () => {
      const kpi = createMockKPI({ achievementPercent: 85 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const result = await alertService.checkKPIAlerts(1, 1);

      expect(result.value).toHaveLength(0); // Sem alertas
    });

    it('should use default config when not provided', async () => {
      const kpi = createMockKPI({ achievementPercent: 65 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      // Não passa config (undefined)
      const result = await alertService.checkKPIAlerts(1, 1);

      expect(result.value[0].thresholdValue).toBe(70); // DEFAULT
    });

    it('should merge partial config with defaults', async () => {
      const kpi = createMockKPI({ achievementPercent: 75 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const partialConfig: PartialAlertConfig = {
        kpiCriticalThreshold: 80, // Custom
        // Outros campos usam defaults
      };

      const result = await alertService.checkKPIAlerts(1, 1, partialConfig);

      expect(result.value[0].thresholdValue).toBe(80); // Custom
    });

    it('should handle empty config object correctly', async () => {
      // BUG-005 original: config = {} causava undefined
      const kpi = createMockKPI({ achievementPercent: 65 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const emptyConfig: PartialAlertConfig = {}; // Vazio!

      const result = await alertService.checkKPIAlerts(1, 1, emptyConfig);

      // Deve usar defaults, não undefined
      expect(result.value[0].thresholdValue).toBe(70); // DEFAULT
    });

    it('should NOT create duplicate alerts for same KPI', async () => {
      const kpi = createMockKPI({ achievementPercent: 60 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      // Mock: alerta já existe
      mockAlertRepo.findByEntity.mockResolvedValue({
        id: 'existing-alert',
      });

      const result = await alertService.checkKPIAlerts(1, 1);

      expect(result.value).toHaveLength(0); // Não duplica
    });
  });

  describe('checkOverdueAlerts - Business Logic', () => {
    it('should detect action plan overdue by 1 day (LOW)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const plan = createMockActionPlan({ whenEnd: yesterday });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [plan], total: 1 });

      const result = await alertService.checkOverdueAlerts(1, 1);

      expect(result.value[0].severity).toBe('LOW');
      expect(result.value[0].currentValue).toBe(1); // 1 day
    });

    it('should detect HIGH severity when overdue >= 3 days', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const plan = createMockActionPlan({ whenEnd: fourDaysAgo });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [plan], total: 1 });

      const result = await alertService.checkOverdueAlerts(1, 1);

      expect(result.value[0].severity).toBe('HIGH');
      expect(result.value[0].currentValue).toBe(4);
    });

    it('should detect CRITICAL severity when overdue >= 7 days', async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const plan = createMockActionPlan({ whenEnd: tenDaysAgo });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [plan], total: 1 });

      const result = await alertService.checkOverdueAlerts(1, 1);

      expect(result.value[0].severity).toBe('CRITICAL');
    });

    it('should use custom config thresholds', async () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const plan = createMockActionPlan({ whenEnd: fiveDaysAgo });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [plan], total: 1 });

      const customConfig: PartialAlertConfig = {
        overdueDaysWarning: 2,
        overdueDaysCritical: 5,
      };

      const result = await alertService.checkOverdueAlerts(1, 1, customConfig);

      expect(result.value[0].severity).toBe('CRITICAL'); // 5 days = critical
    });
  });

  describe('runAllChecks - Integration', () => {
    it('should run all checks and save alerts', async () => {
      const kpi = createMockKPI({ achievementPercent: 60 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const overduePlan = createMockActionPlan({
        whenEnd: new Date(Date.now() - 86400000), // 1 day ago
      });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [overduePlan], total: 1 });

      const result = await alertService.runAllChecks(1, 1);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.created).toBe(2); // KPI + Overdue
      expect(mockAlertRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should return 0 alerts when all KPIs on track', async () => {
      const kpi = createMockKPI({ achievementPercent: 95 });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });
      mockActionPlanRepo.findMany.mockResolvedValue({ items: [], total: 0 });

      const result = await alertService.runAllChecks(1, 1);

      expect(result.value.created).toBe(0);
      expect(mockAlertRepo.save).not.toHaveBeenCalled();
    });

    it('should handle null achievementPercent gracefully', async () => {
      const kpi = createMockKPI({ achievementPercent: null });
      mockKPIRepo.findMany.mockResolvedValue({ items: [kpi], total: 1 });

      const result = await alertService.checkKPIAlerts(1, 1);

      expect(result.value).toHaveLength(0); // Não cria alerta para null
    });
  });
});

// Helper functions
function createMockKPI(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'kpi-1',
    name: 'Test KPI',
    achievementPercent: 70,
    ...overrides,
  };
}

function createMockActionPlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'plan-1',
    what: 'Test Plan',
    whenEnd: new Date(),
    status: 'IN_PROGRESS',
    ...overrides,
  };
}
