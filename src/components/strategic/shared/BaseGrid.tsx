'use client';

import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
// Theming API v34 (sem ag-grid.css - conflito #239)
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Registrar módulos AG Grid Enterprise (obrigatório v34+)
ModuleRegistry.registerModules([AllEnterpriseModule]);
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface BaseGridProps<T = Record<string, unknown>> {
  rowData: T[];
  columnDefs: ColDef[];
  onRowClicked?: (data: T) => void;
  masterDetail?: boolean;
  detailCellRenderer?: unknown;
  detailCellRendererParams?: unknown;
  loading?: boolean;
  paginationPageSize?: number;
  enableExport?: boolean;
  enableCharts?: boolean;
  moduleName?: string; // Para ARIA labels
  mobileColumns?: string[]; // Colunas prioritárias em mobile
}

export function BaseGrid<T = Record<string, unknown>>({
  rowData,
  columnDefs,
  onRowClicked,
  masterDetail = false,
  detailCellRenderer,
  detailCellRendererParams,
  loading = false,
  paginationPageSize = 20,
  enableExport = true,
  enableCharts = false, // Desativado até registrar IntegratedChartsModule (#200)
  moduleName = 'Dados',
  mobileColumns = ['code', 'title', 'name', 'status', 'actions'],
}: BaseGridProps<T>) {
  // Detectar mobile para ajustar colunas
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Colunas responsivas: em mobile, mostrar apenas colunas prioritárias
  const responsiveColumnDefs = useMemo<ColDef[]>(() => {
    if (!isMobile) return columnDefs;

    // Em mobile, filtrar apenas colunas prioritárias
    return columnDefs.filter((col) => {
      const field = typeof col.field === 'string' ? col.field : '';
      return mobileColumns.some((mobileCol) => field.includes(mobileCol));
    });
  }, [isMobile, columnDefs, mobileColumns]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: !isMobile, // Desabilitar filtros em mobile (usar filtros globais)
      resizable: !isMobile,
      flex: 1,
      minWidth: isMobile ? 80 : 100,
    }),
    [isMobile]
  );

  const gridOptions = useMemo<GridOptions>(
    () => ({
      pagination: true,
      paginationPageSize: isMobile ? 10 : paginationPageSize, // Menos linhas em mobile
      paginationPageSizeSelector: isMobile ? [5, 10, 20] : [10, 20, 25, 50, 100],
      rowSelection: {
        mode: 'singleRow',
        checkboxes: false,
        enableClickSelection: true,
      },
      animateRows: !isMobile, // Desabilitar animações em mobile (performance)
      masterDetail: !isMobile && masterDetail, // Master-detail apenas em desktop
      detailCellRenderer: !isMobile ? detailCellRenderer : undefined,
      detailCellRendererParams: !isMobile ? detailCellRendererParams : undefined,
      cellSelection: !isMobile && enableExport, // Substitui enableRangeSelection (deprecated v31.2)
      enableCharts: false, // Sempre desativado até registrar módulo (#200)
      rowGroupPanelShow: isMobile ? undefined : 'always',
      suppressMovableColumns: isMobile, // Travar colunas em mobile
      defaultExcelExportParams: enableExport
        ? {
            fileName: `export_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: 'Dados',
          }
        : undefined,
      defaultCsvExportParams: enableExport
        ? {
            fileName: `export_${new Date().toISOString().split('T')[0]}.csv`,
          }
        : undefined,
      // Acessibilidade: sempre ativa no AG Grid v34+ (enableAccessibility removido)
    }),
    [masterDetail, detailCellRenderer, detailCellRendererParams, paginationPageSize, enableExport, enableCharts, isMobile]
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      // Auto-ajustar colunas em desktop, manter tamanhos fixos em mobile
      if (!isMobile) {
        params.api.sizeColumnsToFit();
      }
    },
    [isMobile]
  );

  if (loading) {
    return (
      <div
        className="flex h-[600px] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={`Carregando ${moduleName}`}
      >
        <div className="text-center">
          <div
            className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
            aria-hidden="true"
          ></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!rowData || rowData.length === 0) {
    return (
      <div
        className="flex h-[600px] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <p className="text-gray-600">Nenhum registro encontrado</p>
        </div>
      </div>
    );
  }

  // Altura responsiva
  const gridHeight = isMobile ? '500px' : isTablet ? '550px' : '600px';

  return (
    <div
      className="ag-theme-quartz"
      style={{ height: gridHeight, width: '100%' }}
      role="region"
      aria-label={`Tabela de ${moduleName}`}
    >
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={responsiveColumnDefs}
        defaultColDef={defaultColDef}
        gridOptions={gridOptions}
        onGridReady={onGridReady}
        onRowClicked={(event) => {
          if (event.data && onRowClicked) {
            onRowClicked(event.data);
          }
        }}
        getRowId={(params) => {
          const data = params.data as { id?: string } | undefined;
          if (data?.id) return data.id;
          
          // Use a stable hash of the data as fallback instead of random ID
          // This ensures the same data always gets the same ID across renders
          const dataStr = JSON.stringify(data || {});
          let hash = 0;
          for (let i = 0; i < dataStr.length; i++) {
            const char = dataStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          return `row-${Math.abs(hash)}`;
        }}
      />
    </div>
  );
}
