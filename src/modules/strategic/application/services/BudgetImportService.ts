import { injectable } from 'tsyringe';
import { db, getFirstRow } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { VarianceAnalysisService } from './VarianceAnalysisService';
import { parse } from 'csv-parse/sync';

export interface ImportRow {
  kpi_code: string;
  year: string;
  month: string;
  budget_value: string;
  forecast_value?: string;
  notes?: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    kpiCode: string;
    error: string;
  }>;
}

@injectable()
export class BudgetImportService {
  private varianceService = new VarianceAnalysisService();

  async importFromCSV(
    organizationId: number,
    branchId: number,
    csvContent: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    // Parse CSV
    let rows: ImportRow[];
    try {
      rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      throw new Error(`Erro ao parsear CSV: ${error}`);
    }

    result.totalRows = rows.length;

    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é header

      try {
        // Validar campos obrigatórios
        if (!row.kpi_code?.trim()) {
          throw new Error('kpi_code é obrigatório');
        }
        if (!row.year || isNaN(parseInt(row.year))) {
          throw new Error('year inválido');
        }
        if (!row.month || isNaN(parseInt(row.month)) || parseInt(row.month) < 1 || parseInt(row.month) > 12) {
          throw new Error('month inválido (1-12)');
        }
        if (!row.budget_value || isNaN(parseFloat(row.budget_value))) {
          throw new Error('budget_value inválido');
        }

        // Buscar KPI pelo código
        const kpiResult = await db.execute(sql`
          SELECT id FROM strategic_kpi
          WHERE code = ${row.kpi_code.trim()}
            AND organization_id = ${organizationId}
            AND branch_id = ${branchId}
            AND deleted_at IS NULL
        `);

        const kpi = getFirstRow(kpiResult);
        if (!kpi) {
          throw new Error(`KPI não encontrado: ${row.kpi_code}`);
        }

        // Salvar BUDGET
        await this.varianceService.saveVersionValue(organizationId, branchId, {
          kpiId: kpi.id,
          versionType: 'BUDGET',
          year: parseInt(row.year),
          month: parseInt(row.month),
          value: parseFloat(row.budget_value),
          notes: row.notes?.trim() || undefined,
          createdBy: userId,
        });

        // Salvar FORECAST (se fornecido)
        if (row.forecast_value && !isNaN(parseFloat(row.forecast_value))) {
          await this.varianceService.saveVersionValue(organizationId, branchId, {
            kpiId: kpi.id,
            versionType: 'FORECAST',
            year: parseInt(row.year),
            month: parseInt(row.month),
            value: parseFloat(row.forecast_value),
            notes: row.notes?.trim() || undefined,
            createdBy: userId,
          });
        }

        result.successCount++;
      } catch (error) {
        result.errorCount++;
        result.errors.push({
          row: rowNumber,
          kpiCode: row.kpi_code || 'N/A',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Gera template CSV para download
   */
  generateTemplate(kpiCodes: string[]): string {
    const header = 'kpi_code,year,month,budget_value,forecast_value,notes';
    const currentYear = new Date().getFullYear();

    const rows = kpiCodes.flatMap(code =>
      Array.from({ length: 12 }, (_, i) =>
        `${code},${currentYear},${i + 1},0,,`
      )
    );

    return [header, ...rows].join('\n');
  }
}
