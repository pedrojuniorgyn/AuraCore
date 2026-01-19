/**
 * Tipos para AG Grid Server-Side Row Model (SSRM)
 * 
 * @module types/ag-grid-ssrm
 * @see ADR-0006 - Paginação no SQL Server
 * @see https://www.ag-grid.com/react-data-grid/server-side-model-datasource/
 */

/**
 * Request enviado pelo AG Grid para buscar dados
 */
export interface IServerSideGetRowsRequest {
  // Paginação
  startRow: number;
  endRow: number;
  
  // Ordenação
  sortModel: SortModelItem[];
  
  // Filtros
  filterModel: Record<string, FilterModel>;
  
  // Agrupamento (Enterprise)
  rowGroupCols: ColumnVO[];
  groupKeys: string[];
  
  // Pivot (Enterprise)
  pivotCols: ColumnVO[];
  pivotMode: boolean;
  
  // Valores agregados (Enterprise)
  valueCols: ColumnVO[];
}

export interface SortModelItem {
  colId: string;
  sort: 'asc' | 'desc';
}

export interface ColumnVO {
  id: string;
  displayName: string;
  field: string;
  aggFunc?: string;
}

/**
 * Modelo de filtro do AG Grid
 */
export type FilterModel = 
  | TextFilterModel 
  | NumberFilterModel 
  | DateFilterModel 
  | SetFilterModel;

export interface TextFilterModel {
  filterType: 'text';
  type: 'equals' | 'notEqual' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'blank' | 'notBlank';
  filter?: string;
}

export interface NumberFilterModel {
  filterType: 'number';
  type: 'equals' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'inRange' | 'blank' | 'notBlank';
  filter?: number;
  filterTo?: number;
}

export interface DateFilterModel {
  filterType: 'date';
  type: 'equals' | 'notEqual' | 'greaterThan' | 'lessThan' | 'inRange' | 'blank' | 'notBlank';
  dateFrom?: string;
  dateTo?: string;
}

export interface SetFilterModel {
  filterType: 'set';
  values: string[];
}

/**
 * Response retornado pela API SSRM
 */
export interface IServerSideGetRowsResponse<T> {
  /** Dados da página atual */
  rowData: T[];
  
  /** 
   * Total de registros (para paginação infinita)
   * - Se conhecido: número exato
   * - Se desconhecido: -1 (AG Grid assume que há mais dados)
   */
  rowCount: number;
}

/**
 * Opções para configurar o helper SSRM
 */
export interface SSRMHelperOptions {
  /** Campos permitidos para filtro (whitelist de segurança) */
  allowedFilterFields: string[];
  
  /** Campos permitidos para ordenação (whitelist de segurança) */
  allowedSortFields: string[];
  
  /** Ordenação padrão quando nenhuma é especificada */
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  /** Limite máximo de registros por página (proteção contra abuso) */
  maxPageSize?: number;
}

/**
 * Contexto de execução para queries SSRM
 */
export interface SSRMContext {
  organizationId: number;
  branchId: number;
}
