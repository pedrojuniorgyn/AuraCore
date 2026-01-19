/**
 * Use Case: SyncKPIValuesUseCase
 * Sincroniza valores de KPIs com cálculo automático
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IKPIDataSource } from '../../infrastructure/integrations/IKPIDataSource';
import { KPI } from '../../domain/entities/KPI';

export interface SyncKPIResult {
  kpiId: string;
  code: string;
  previousValue: number;
  newValue: number;
  status: 'UPDATED' | 'NO_DATA' | 'ERROR';
  error?: string;
}

export interface SyncKPIValuesOutput {
  syncedCount: number;
  results: SyncKPIResult[];
}

export interface ISyncKPIValuesUseCase {
  execute(context: TenantContext): Promise<Result<SyncKPIValuesOutput, string>>;
}

@injectable()
export class SyncKPIValuesUseCase implements ISyncKPIValuesUseCase {
  private readonly dataSources: Map<string, IKPIDataSource>;

  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.FinancialKPIAdapter)
    financialDataSource: IKPIDataSource,
    @inject(STRATEGIC_TOKENS.TMSKPIAdapter)
    tmsDataSource: IKPIDataSource
  ) {
    // Inicializar Map com DataSources injetados via DI
    this.dataSources = new Map<string, IKPIDataSource>([
      [financialDataSource.moduleName, financialDataSource],
      [tmsDataSource.moduleName, tmsDataSource],
    ]);
  }

  async execute(context: TenantContext): Promise<Result<SyncKPIValuesOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar KPIs com autoCalculate = true
    const kpis = await this.kpiRepository.findForAutoCalculation(
      context.organizationId,
      context.branchId
    );

    const results: SyncKPIResult[] = [];

    // 3. Para cada KPI, buscar valor da fonte
    for (const kpi of kpis) {
      const result = await this.syncSingleKPI(kpi, context);
      results.push(result);
    }

    const syncedCount = results.filter(r => r.status === 'UPDATED').length;

    return Result.ok({
      syncedCount,
      results,
    });
  }

  private async syncSingleKPI(kpi: KPI, context: TenantContext): Promise<SyncKPIResult> {
    // Verificar configuração
    if (!kpi.sourceModule || !kpi.sourceQuery) {
      return {
        kpiId: kpi.id,
        code: kpi.code,
        previousValue: kpi.currentValue,
        newValue: kpi.currentValue,
        status: 'ERROR',
        error: 'Configuração de fonte incompleta (sourceModule ou sourceQuery)',
      };
    }

    // Buscar fonte de dados
    const dataSource = this.dataSources.get(kpi.sourceModule);
    if (!dataSource) {
      return {
        kpiId: kpi.id,
        code: kpi.code,
        previousValue: kpi.currentValue,
        newValue: kpi.currentValue,
        status: 'ERROR',
        error: `Fonte de dados não registrada: ${kpi.sourceModule}`,
      };
    }

    try {
      // Executar query
      const dataPoint = await dataSource.executeQuery(
        kpi.sourceQuery,
        context.organizationId,
        context.branchId
      );

      if (!dataPoint) {
        return {
          kpiId: kpi.id,
          code: kpi.code,
          previousValue: kpi.currentValue,
          newValue: kpi.currentValue,
          status: 'NO_DATA',
        };
      }

      // Guardar valor anterior
      const previousValue = kpi.currentValue;

      // Atualizar valor (verificar Result - REGRA: SEMPRE verificar Result.isFail())
      const updateResult = kpi.updateValue(dataPoint.value);
      if (Result.isFail(updateResult)) {
        return {
          kpiId: kpi.id,
          code: kpi.code,
          previousValue,
          newValue: dataPoint.value,
          status: 'ERROR',
          error: updateResult.error,
        };
      }

      await this.kpiRepository.save(kpi);

      return {
        kpiId: kpi.id,
        code: kpi.code,
        previousValue,
        newValue: dataPoint.value,
        status: 'UPDATED',
      };
    } catch (error) {
      return {
        kpiId: kpi.id,
        code: kpi.code,
        previousValue: kpi.currentValue,
        newValue: kpi.currentValue,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
