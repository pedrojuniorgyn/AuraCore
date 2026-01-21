'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Widget, WidgetConfig } from '@/lib/dashboard/dashboard-types';

// ============================================
// TIPOS
// ============================================
interface WidgetData {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

export interface UseWidgetsReturn {
  widgetData: Record<string, unknown>;
  isLoading: Record<string, boolean>;
  errors: Record<string, Error | null>;
  refreshWidget: (widgetId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

// ============================================
// MOCK DATA FETCHERS
// ============================================
async function fetchKpiData(_config: WidgetConfig): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    value: Math.round(Math.random() * 100),
    target: 100,
    trend: Math.random() > 0.5 ? 'up' : 'down',
    variation: (Math.random() * 10).toFixed(1),
  };
}

async function fetchLeaderboardData(_config: WidgetConfig): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    entries: [
      { rank: 1, name: 'João', xp: 5230 },
      { rank: 2, name: 'Maria', xp: 4850 },
      { rank: 3, name: 'Pedro', xp: 4420 },
    ],
  };
}

async function fetchStreakData(): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    current: 15,
    longest: 32,
    lastActive: new Date(),
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================
export function useWidgets(widgets: Widget[]): UseWidgetsReturn {
  // ============================================
  // STATE
  // ============================================
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  // ============================================
  // REFS (para evitar dependências instáveis e race conditions)
  // ============================================
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const widgetsRef = useRef(widgets);
  const initialLoadDoneRef = useRef(false);

  // Manter ref sincronizada com prop
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // ============================================
  // FETCH DATA PARA UM WIDGET
  // ============================================
  const fetchWidgetData = useCallback(
    async (widget: Widget): Promise<WidgetData> => {
      try {
        let data: unknown = null;

        switch (widget.type) {
          case 'kpi_card':
          case 'kpi_chart':
          case 'kpi_gauge':
            data = await fetchKpiData(widget.config);
            break;
          case 'leaderboard':
            data = await fetchLeaderboardData(widget.config);
            break;
          case 'streak':
            data = await fetchStreakData();
            break;
          default:
            data = {};
        }

        return { data, isLoading: false, error: null };
      } catch (err) {
        return {
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to fetch widget data'),
        };
      }
    },
    []
  );

  // ============================================
  // REFRESH ALL WIDGETS
  // ============================================
  const refreshAll = useCallback(async () => {
    // Evitar múltiplas execuções simultâneas
    if (isRefreshingRef.current) {
      return;
    }

    const currentWidgets = widgetsRef.current;
    if (currentWidgets.length === 0) {
      return;
    }

    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    isRefreshingRef.current = true;

    // Marcar todos como loading
    if (isMountedRef.current) {
      const loadingState: Record<string, boolean> = {};
      currentWidgets.forEach((w) => {
        loadingState[w.id] = true;
      });
      setIsLoading(loadingState);
    }

    try {
      // Buscar dados de todos os widgets em paralelo
      const results = await Promise.all(
        currentWidgets.map(async (widget) => {
          const result = await fetchWidgetData(widget);
          return { id: widget.id, ...result };
        })
      );

      // Só atualizar se ainda montado
      if (isMountedRef.current) {
        const newData: Record<string, unknown> = {};
        const newLoading: Record<string, boolean> = {};
        const newErrors: Record<string, Error | null> = {};

        results.forEach((result) => {
          newData[result.id] = result.data;
          newLoading[result.id] = false;
          newErrors[result.id] = result.error;
        });

        setWidgetData(newData);
        setIsLoading(newLoading);
        setErrors(newErrors);
      }
    } catch (err) {
      // Ignorar erros se componente foi desmontado
      if (!isMountedRef.current) return;

      // Marcar todos como erro
      const errorState: Record<string, Error | null> = {};
      const loadingState: Record<string, boolean> = {};
      currentWidgets.forEach((w) => {
        errorState[w.id] = err instanceof Error ? err : new Error('Failed to refresh');
        loadingState[w.id] = false;
      });
      setErrors(errorState);
      setIsLoading(loadingState);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [fetchWidgetData]);

  // ============================================
  // REFRESH SINGLE WIDGET
  // ============================================
  const refreshWidget = useCallback(
    async (widgetId: string) => {
      const widget = widgetsRef.current.find((w) => w.id === widgetId);
      if (!widget) return;

      // Marcar widget como loading
      if (isMountedRef.current) {
        setIsLoading((prev) => ({ ...prev, [widgetId]: true }));
        setErrors((prev) => ({ ...prev, [widgetId]: null }));
      }

      const result = await fetchWidgetData(widget);

      // Só atualizar se ainda montado
      if (isMountedRef.current) {
        setWidgetData((prev) => ({ ...prev, [widgetId]: result.data }));
        setIsLoading((prev) => ({ ...prev, [widgetId]: false }));
        setErrors((prev) => ({ ...prev, [widgetId]: result.error }));
      }
    },
    [fetchWidgetData]
  );

  // ============================================
  // EFFECT: INICIAL (apenas no mount)
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup no unmount
    return () => {
      isMountedRef.current = false;

      // Cancelar requests pendentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // EFFECT: CARREGAR DADOS INICIAIS
  // ============================================
  useEffect(() => {
    // Só executar uma vez e quando tiver widgets
    if (initialLoadDoneRef.current || widgets.length === 0) {
      return;
    }

    initialLoadDoneRef.current = true;

    // Usar setTimeout para evitar chamada síncrona no render
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        refreshAll();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [widgets.length, refreshAll]);

  // ============================================
  // RETURN
  // ============================================
  return {
    widgetData,
    isLoading,
    errors,
    refreshWidget,
    refreshAll,
  };
}

export default useWidgets;
