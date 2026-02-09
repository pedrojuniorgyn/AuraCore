import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetImportService } from '@/modules/strategic/application/services/BudgetImportService';
import { Result } from '@/shared/domain';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

describe('BudgetImportService', () => {
  let service: BudgetImportService;
  let mockKPIRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockGoalRepo: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockKPIRepo = {
      findByCode: vi.fn(),
      addValueVersion: vi.fn().mockResolvedValue(undefined),
    };

    mockGoalRepo = {
      findByCode: vi.fn(),
      addValueVersion: vi.fn().mockResolvedValue(undefined),
    };

    service = new BudgetImportService(mockKPIRepo as unknown as IKPIRepository, mockGoalRepo as unknown as IStrategicGoalRepository);
  });

  describe('importKPIValues - CSV Parsing', () => {
    it('should import valid CSV with 2 rows', async () => {
      const csv = `kpi_code,period_start,period_end,value_type,value
KPI-001,2026-01-01,2026-01-31,BUDGET,100000
KPI-002,2026-01-01,2026-01-31,BUDGET,200000`;

      mockKPIRepo.findByCode.mockResolvedValue({ id: 'kpi-1' });

      const result = await service.importKPIValues(1, 1, csv);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(2);
      expect(result.value.failed).toBe(0);
      expect(mockKPIRepo.addValueVersion).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid CSV format', async () => {
      const csv = `invalid,header,format
data,data,data`;

      const result = await service.importKPIValues(1, 1, csv);

      expect(Result.isOk(result)).toBe(true); // Parse succeed but rows fail
      expect(result.value.failed).toBeGreaterThan(0);
    });

    it('should handle KPI not found', async () => {
      const csv = `kpi_code,period_start,period_end,value_type,value
INVALID-KPI,2026-01-01,2026-01-31,BUDGET,100000`;

      mockKPIRepo.findByCode.mockResolvedValue(null); // Não existe

      const result = await service.importKPIValues(1, 1, csv);

      expect(result.value.failed).toBe(1);
      expect(result.value.errors[0].error).toContain('not found');
    });

    it('should validate value_type enum', async () => {
      const csv = `kpi_code,period_start,period_end,value_type,value
KPI-001,2026-01-01,2026-01-31,INVALID_TYPE,100000`;

      const result = await service.importKPIValues(1, 1, csv);

      expect(result.value.failed).toBe(1);
      expect(result.value.errors[0].error).toContain('Invalid value_type');
    });

    it('should validate date format', async () => {
      const csv = `kpi_code,period_start,period_end,value_type,value
KPI-001,invalid-date,2026-01-31,BUDGET,100000`;

      mockKPIRepo.findByCode.mockResolvedValue({ id: 'kpi-1' });

      const result = await service.importKPIValues(1, 1, csv);

      // Date parsing will fail when creating Date object
      expect(result.value.failed).toBe(1);
    });

    it('should validate numeric value', async () => {
      const csv = `kpi_code,period_start,period_end,value_type,value
KPI-001,2026-01-01,2026-01-31,BUDGET,not-a-number`;

      const result = await service.importKPIValues(1, 1, csv);

      expect(result.value.failed).toBe(1);
      expect(result.value.errors[0].error).toContain('Invalid value');
    });
  });

  describe('generateKPITemplate - Dynamic Generation', () => {
    it('should generate template with real KPI codes', () => {
      const kpiCodes = ['VENDAS-Q1', 'LUCRO-BRUTO', 'NPS'];

      const csv = service.generateKPITemplate(kpiCodes);

      expect(csv).toContain('VENDAS-Q1');
      expect(csv).toContain('LUCRO-BRUTO');
      expect(csv).toContain('NPS');
      expect(csv).not.toContain('KPI-001'); // Não hardcoded!
    });

    it('should use current year in template', () => {
      const currentYear = new Date().getFullYear();
      const csv = service.generateKPITemplate(['TEST-KPI']);

      expect(csv).toContain(`${currentYear}-01-01`);
      expect(csv).toContain(`${currentYear}-02-01`);
    });

    it('should return example template when no codes provided', () => {
      const csv = service.generateKPITemplate([]);

      expect(csv).toContain('KPI-001'); // Fallback
    });

    it('should handle undefined kpiCodes parameter', () => {
      const csv = service.generateKPITemplate(undefined);

      expect(csv).toContain('KPI-001'); // Fallback
    });

    it('should create 2 months per KPI code', () => {
      const csv = service.generateKPITemplate(['TEST']);

      const lines = csv.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(3); // Header + 2 months
    });
  });

  describe('importGoalValues - Similar Logic', () => {
    it('should import goal values', async () => {
      const csv = `goal_code,period_start,period_end,value_type,target_value
GOAL-001,2026-01-01,2026-01-31,BUDGET,50000`;

      mockGoalRepo.findByCode.mockResolvedValue({ id: 'goal-1' });

      const result = await service.importGoalValues(1, 1, csv);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(1);
    });

    it('should handle goal not found', async () => {
      const csv = `goal_code,period_start,period_end,value_type,target_value
INVALID-GOAL,2026-01-01,2026-01-31,BUDGET,50000`;

      mockGoalRepo.findByCode.mockResolvedValue(null);

      const result = await service.importGoalValues(1, 1, csv);

      expect(result.value.failed).toBe(1);
      expect(result.value.errors[0].error).toContain('not found');
    });
  });
});
