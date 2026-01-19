/**
 * Interface: IKPIDataSource
 * Interface para fontes de dados de KPIs com cálculo automático
 * 
 * @module strategic/infrastructure/integrations
 */

export interface KPIDataPoint {
  value: number;
  periodDate: Date;
  metadata?: Record<string, unknown>;
}

export interface IKPIDataSource {
  /**
   * Nome do módulo fonte
   */
  readonly moduleName: string;

  /**
   * Executa query para obter valor do KPI
   * @param query Query configurada no KPI (sourceQuery)
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Ponto de dados com valor e data
   */
  executeQuery(
    query: string,
    organizationId: number,
    branchId: number
  ): Promise<KPIDataPoint | null>;

  /**
   * Lista queries disponíveis para este módulo
   * @returns Lista de queries disponíveis com descrição
   */
  getAvailableQueries(): { id: string; name: string; description: string }[];
}
