/**
 * Service: BudgetImportService
 * Serviço de importação de valores de orçamento via CSV
 *
 * @module strategic/application/services
 */
import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { parse } from 'csv-parse/sync';

export interface KPIValueRow {
  kpi_code: string;
  period_start: string;
  period_end: string;
  value_type: 'ACTUAL' | 'BUDGET' | 'FORECAST';
  value: string;
}

export interface GoalValueRow {
  goal_code: string;
  period_start: string;
  period_end: string;
  value_type: 'ACTUAL' | 'BUDGET' | 'FORECAST';
  target_value: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    code: string;
    error: string;
  }>;
}

@injectable()
export class BudgetImportService {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private goalRepository: IStrategicGoalRepository
  ) {}

  async importKPIValues(
    organizationId: number,
    branchId: number,
    csvContent: string
  ): Promise<Result<ImportResult, string>> {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as KPIValueRow[];

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 for header and 0-index

        // Validate row (Result pattern: explicit checks + continue)
        if (!row.kpi_code?.trim()) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: 'kpi_code is required' });
          continue;
        }
        if (!row.period_start || !row.period_end) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: 'period_start and period_end are required' });
          continue;
        }
        if (!['ACTUAL', 'BUDGET', 'FORECAST'].includes(row.value_type)) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: `Invalid value_type: ${row.value_type}` });
          continue;
        }

        const value = parseFloat(row.value);
        if (isNaN(value)) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: `Invalid value: ${row.value}` });
          continue;
        }

        // Validate date format
        const periodStart = new Date(row.period_start);
        const periodEnd = new Date(row.period_end);
        if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: `Invalid date format: ${row.period_start} or ${row.period_end}` });
          continue;
        }

        try {
          // Find KPI by code
          const kpi = await this.kpiRepository.findByCode(
            row.kpi_code.trim(),
            organizationId,
            branchId
          );

          if (!kpi) {
            result.failed++;
            result.errors.push({ row: rowNum, code: row.kpi_code || 'UNKNOWN', error: `KPI not found: ${row.kpi_code}` });
            continue;
          }

          // Create value version
          await this.kpiRepository.addValueVersion({
            kpiId: kpi.id,
            organizationId,
            branchId,
            valueType: row.value_type,
            periodStart,
            periodEnd,
            value,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            code: row.kpi_code || 'UNKNOWN',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error.message : 'Failed to parse CSV'
      );
    }
  }

  async importGoalValues(
    organizationId: number,
    branchId: number,
    csvContent: string
  ): Promise<Result<ImportResult, string>> {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as GoalValueRow[];

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;

        // Validate row (Result pattern: explicit checks + continue)
        if (!row.goal_code?.trim()) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: 'goal_code is required' });
          continue;
        }
        if (!row.period_start || !row.period_end) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: 'period_start and period_end are required' });
          continue;
        }
        if (!['ACTUAL', 'BUDGET', 'FORECAST'].includes(row.value_type)) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: `Invalid value_type: ${row.value_type}` });
          continue;
        }

        const targetValue = parseFloat(row.target_value);
        if (isNaN(targetValue)) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: `Invalid target_value: ${row.target_value}` });
          continue;
        }

        // Validate date format
        const periodStart = new Date(row.period_start);
        const periodEnd = new Date(row.period_end);
        if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
          result.failed++;
          result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: `Invalid date format: ${row.period_start} or ${row.period_end}` });
          continue;
        }

        try {
          const goal = await this.goalRepository.findByCode(
            row.goal_code.trim(),
            organizationId,
            branchId
          );

          if (!goal) {
            result.failed++;
            result.errors.push({ row: rowNum, code: row.goal_code || 'UNKNOWN', error: `Goal not found: ${row.goal_code}` });
            continue;
          }

          await this.goalRepository.addValueVersion({
            goalId: goal.id,
            organizationId,
            branchId,
            valueType: row.value_type,
            periodStart,
            periodEnd,
            targetValue,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            code: row.goal_code || 'UNKNOWN',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error.message : 'Failed to parse CSV'
      );
    }
  }

  generateKPITemplate(kpiCodes?: string[]): string {
    const header = 'kpi_code,period_start,period_end,value_type,value';

    // Se não houver códigos, retornar apenas header + exemplo
    if (!kpiCodes || kpiCodes.length === 0) {
      return `${header}
KPI-001,2026-01-01,2026-01-31,BUDGET,100000.00
KPI-001,2026-02-01,2026-02-28,BUDGET,120000.00`;
    }

    // Gerar linhas personalizadas com os KPIs reais da organização
    const currentYear = new Date().getFullYear();
    const rows: string[] = [header];

    // Para cada KPI, criar 2 linhas exemplo (Jan e Fev)
    kpiCodes.forEach((code) => {
      rows.push(`${code},${currentYear}-01-01,${currentYear}-01-31,BUDGET,0.00`);
      rows.push(`${code},${currentYear}-02-01,${currentYear}-02-28,BUDGET,0.00`);
    });

    return rows.join('\n');
  }

  generateGoalTemplate(): string {
    return `goal_code,period_start,period_end,value_type,target_value
GOAL-FIN-01,2026-01-01,2026-12-31,BUDGET,5000000.00`;
  }
}
