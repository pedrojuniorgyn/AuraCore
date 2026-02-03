/**
 * Hook: useAgGridExport
 * Exportação de dados de AG-Grid para Excel e CSV
 * 
 * @module hooks/useAgGridExport
 * @see LC-EXPORT-001
 */
import { useCallback, type RefObject } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import * as XLSX from 'xlsx';

/** Resultado da exportação */
export interface ExportResult {
  success: boolean;
  recordCount: number;
  fileName: string;
}

/**
 * Hook para exportação de dados de AG-Grid
 * 
 * @param gridRef - Referência ao componente AgGridReact
 * @returns Funções de exportação assíncronas para Excel e CSV
 * 
 * @example
 * const gridRef = useRef<AgGridReact>(null);
 * const { exportToExcel, exportToCSV } = useAgGridExport(gridRef);
 * 
 * const handleExport = async () => {
 *   try {
 *     const result = await exportToExcel('meus_dados');
 *     toast.success(`${result.recordCount} registros exportados!`);
 *   } catch (error) {
 *     toast.error('Erro ao exportar');
 *   }
 * };
 */
export function useAgGridExport(gridRef: RefObject<AgGridReact | null>) {
  /**
   * Exporta dados filtrados e ordenados para Excel (.xlsx)
   * 
   * @param fileName - Prefixo do nome do arquivo (sem extensão)
   * @returns Promise com resultado da exportação
   */
  const exportToExcel = useCallback(async (fileName: string = 'export'): Promise<ExportResult> => {
    return new Promise((resolve, reject) => {
      try {
        if (!gridRef.current?.api) {
          reject(new Error('Grid não está pronto para exportação'));
          return;
        }

        const api = gridRef.current.api;
        const columnDefs = api.getColumnDefs();
        const allData: Record<string, unknown>[] = [];

        // Pegar dados filtrados e ordenados
        api.forEachNodeAfterFilterAndSort((node) => {
          if (node.data) {
            // Mapear para exibir apenas colunas visíveis com headers legíveis
            const row: Record<string, unknown> = {};
            columnDefs?.forEach((colDef) => {
              if ('field' in colDef && colDef.field) {
                const headerName = 'headerName' in colDef && colDef.headerName 
                  ? String(colDef.headerName) 
                  : colDef.field;
                const value = node.data[colDef.field];
                
                // Formatar valores para exibição
                if (value instanceof Date) {
                  row[headerName] = value.toLocaleDateString('pt-BR');
                } else if (typeof value === 'object' && value !== null) {
                  row[headerName] = JSON.stringify(value);
                } else {
                  row[headerName] = value;
                }
              }
            });
            allData.push(row);
          }
        });

        if (allData.length === 0) {
          reject(new Error('Nenhum dado para exportar'));
          return;
        }

        // Criar worksheet e workbook
        const worksheet = XLSX.utils.json_to_sheet(allData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

        // Gerar nome do arquivo com timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}_${timestamp}.xlsx`;
        XLSX.writeFile(workbook, fullFileName);

        resolve({
          success: true,
          recordCount: allData.length,
          fileName: fullFileName,
        });
      } catch (error) {
        reject(error);
      }
    });
  }, [gridRef]);

  /**
   * Exporta dados filtrados para CSV usando API nativa do AG-Grid
   * 
   * @param fileName - Prefixo do nome do arquivo (sem extensão)
   * @returns Promise com resultado da exportação
   */
  const exportToCSV = useCallback(async (fileName: string = 'export'): Promise<ExportResult> => {
    return new Promise((resolve, reject) => {
      try {
        if (!gridRef.current?.api) {
          reject(new Error('Grid não está pronto para exportação'));
          return;
        }

        const api = gridRef.current.api;
        
        // Contar registros filtrados
        let recordCount = 0;
        api.forEachNodeAfterFilterAndSort(() => {
          recordCount++;
        });

        if (recordCount === 0) {
          reject(new Error('Nenhum dado para exportar'));
          return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}_${timestamp}.csv`;
        
        api.exportDataAsCsv({
          fileName: fullFileName,
          columnSeparator: ';',
          allColumns: false, // Apenas colunas visíveis
        });

        resolve({
          success: true,
          recordCount,
          fileName: fullFileName,
        });
      } catch (error) {
        reject(error);
      }
    });
  }, [gridRef]);

  return { exportToExcel, exportToCSV };
}

/**
 * Exporta array de dados genérico para Excel
 * Para uso em páginas que NÃO usam AG-Grid
 * 
 * @param data - Array de objetos para exportar
 * @param fileName - Prefixo do nome do arquivo
 * @param sheetName - Nome da aba (default: 'Dados')
 * @returns Promise com resultado da exportação
 */
export async function exportArrayToExcel<T extends Record<string, unknown>>(
  data: T[],
  fileName: string,
  sheetName: string = 'Dados'
): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        reject(new Error('Nenhum dado para exportar'));
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const timestamp = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, fullFileName);

      resolve({
        success: true,
        recordCount: data.length,
        fileName: fullFileName,
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exporta array de dados genérico para CSV
 * Para uso em páginas que NÃO usam AG-Grid
 * 
 * @param data - Array de objetos para exportar
 * @param fileName - Prefixo do nome do arquivo
 * @returns Promise com resultado da exportação
 */
export async function exportArrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  fileName: string
): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        reject(new Error('Nenhum dado para exportar'));
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
      
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}_${timestamp}.csv`;
      link.href = url;
      link.download = fullFileName;
      link.click();
      
      URL.revokeObjectURL(url);

      resolve({
        success: true,
        recordCount: data.length,
        fileName: fullFileName,
      });
    } catch (error) {
      reject(error);
    }
  });
}
