'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Widget, WidgetConfig } from '@/lib/dashboard/dashboard-types';

interface UseWidgetsReturn {
  widgetData: Record<string, unknown>;
  isLoading: Record<string, boolean>;
  errors: Record<string, Error | null>;
  refreshWidget: (widgetId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useWidgets(widgets: Widget[]): UseWidgetsReturn {
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  // Usar ref para evitar dependências instáveis no useCallback
  const widgetsRef = useRef(widgets);

  // Atualizar ref quando widgets mudar
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const fetchWidgetData = useCallback(async (widget: Widget) => {
    setIsLoading((prev) => ({ ...prev, [widget.id]: true }));
    setErrors((prev) => ({ ...prev, [widget.id]: null }));

    try {
      // Simular fetch de dados baseado no tipo do widget
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

      setWidgetData((prev) => ({ ...prev, [widget.id]: data }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [widget.id]: err instanceof Error ? err : new Error('Failed to fetch widget data'),
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, [widget.id]: false }));
    }
  }, []);

  const refreshWidget = useCallback(
    async (widgetId: string) => {
      const widget = widgetsRef.current.find((w) => w.id === widgetId);
      if (widget) {
        await fetchWidgetData(widget);
      }
    },
    [fetchWidgetData]
  );

  // refreshAll usa ref para evitar recriação quando widgets muda
  const refreshAll = useCallback(async () => {
    const currentWidgets = widgetsRef.current;
    if (currentWidgets.length === 0) return;

    await Promise.all(currentWidgets.map((w) => fetchWidgetData(w)));
  }, [fetchWidgetData]);

  // Efeito inicial - executa apenas no mount
  useEffect(() => {
    // Verificar se há widgets para carregar
    if (widgetsRef.current.length > 0) {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio = apenas no mount

  // Efeito para recarregar quando widgets.length muda significativamente
  const prevLengthRef = useRef(widgets.length);
  useEffect(() => {
    if (widgets.length !== prevLengthRef.current && widgets.length > 0) {
      prevLengthRef.current = widgets.length;
      refreshAll();
    }
  }, [widgets.length, refreshAll]);

  return {
    widgetData,
    isLoading,
    errors,
    refreshWidget,
    refreshAll,
  };
}

// Mock data fetchers
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
