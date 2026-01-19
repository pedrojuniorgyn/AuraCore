/**
 * Hook para criar datasource SSRM para AG Grid
 * 
 * @module hooks/useSSRMDatasource
 * @see E8.4.1 - SSRM React Integration
 */

'use client';

import { useMemo, useCallback } from 'react';
import type { IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community';

interface UseSSRMDatasourceOptions {
  /** Endpoint da API SSRM (ex: '/api/financial/payables/ssrm') */
  endpoint: string;
  /** Callback opcional para erros */
  onError?: (error: Error) => void;
  /** Callback opcional para sucesso */
  onSuccess?: (rowCount: number) => void;
}

/**
 * Hook que cria um datasource SSRM para AG Grid.
 * 
 * @example
 * ```tsx
 * const datasource = useSSRMDatasource({
 *   endpoint: '/api/financial/payables/ssrm',
 *   onError: (error) => toast.error(error.message),
 * });
 * 
 * // No onGridReady:
 * event.api.setGridOption('serverSideDatasource', datasource);
 * ```
 */
export function useSSRMDatasource({ 
  endpoint, 
  onError, 
  onSuccess 
}: UseSSRMDatasourceOptions): IServerSideDatasource {
  
  const getRows = useCallback(async (params: IServerSideGetRowsParams) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Sucesso - informar AG Grid
      params.success({
        rowData: data.rowData,
        rowCount: data.rowCount,
      });

      // Callback de sucesso opcional
      onSuccess?.(data.rowCount);

    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('[SSRM] Error:', errorObj.message);
      
      // Callback de erro opcional
      onError?.(errorObj);
      
      // Informar AG Grid que falhou
      params.fail();
    }
  }, [endpoint, onError, onSuccess]);

  // Memoizar datasource para evitar re-renders desnecessários
  return useMemo(() => ({ getRows }), [getRows]);
}
