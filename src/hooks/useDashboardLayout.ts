'use client';

import { useState, useCallback, useEffect } from 'react';
import { WidgetType } from '@/components/strategic/WidgetPicker';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetConfig {
  i: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

const defaultLayout: WidgetConfig[] = [
  { i: 'w1', type: 'health-score', x: 0, y: 0, w: 1, h: 2 },
  { i: 'w2', type: 'alerts', x: 1, y: 0, w: 1, h: 2 },
  { i: 'w3', type: 'aurora-insight', x: 2, y: 0, w: 1, h: 2 },
  { i: 'w4', type: 'trend-chart', x: 0, y: 2, w: 2, h: 2 },
  { i: 'w5', type: 'actions', x: 2, y: 2, w: 1, h: 2 },
  { i: 'w6', type: 'kpi-summary', x: 0, y: 4, w: 3, h: 1 },
];

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from API with cleanup
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadLayout = async () => {
      try {
        const response = await fetch('/api/strategic/dashboard/layout', {
          signal: controller.signal,
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.layout?.length > 0) {
            setWidgets(data.layout);
          }
        }
      } catch (error) {
        // Ignorar erro de abort
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        if (isMounted) {
          console.error('Failed to load dashboard layout:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLayout();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Save to API
  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch('/api/strategic/dashboard/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: widgets }),
      });
      return true;
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [widgets]);

  const handleLayoutChange = useCallback((layout: readonly LayoutItem[]) => {
    setWidgets(prev => 
      prev.map(widget => {
        const newPos = layout.find(l => l.i === widget.i);
        if (newPos) {
          return { 
            ...widget, 
            x: newPos.x, 
            y: newPos.y, 
            w: newPos.w, 
            h: newPos.h 
          };
        }
        return widget;
      })
    );
  }, []);

  // FIX Bug 5: Calcular Y baseado no widget mais baixo existente (não usar Infinity)
  const addWidget = useCallback((type: WidgetType, defaultSize: { w: number; h: number }) => {
    setWidgets(prev => {
      // Calcular a posição Y máxima atual
      const maxY = prev.reduce((max, widget) => {
        const widgetBottom = widget.y + widget.h;
        return widgetBottom > max ? widgetBottom : max;
      }, 0);

      const newWidget: WidgetConfig = {
        i: `w${Date.now()}`,
        type,
        x: 0,
        y: maxY, // Posiciona abaixo do último widget
        w: defaultSize.w,
        h: defaultSize.h,
      };

      return [...prev, newWidget];
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.i !== id));
  }, []);

  const toggleWidget = useCallback((type: WidgetType, defaultSize: { w: number; h: number }) => {
    const exists = widgets.some(w => w.type === type);
    if (exists) {
      setWidgets(prev => prev.filter(w => w.type !== type));
    } else {
      addWidget(type, defaultSize);
    }
  }, [widgets, addWidget]);

  const resetLayout = useCallback(() => {
    setWidgets(defaultLayout);
  }, []);

  const activeWidgetTypes = widgets.map(w => w.type);

  return {
    widgets,
    isEditing,
    isSaving,
    isLoading,
    activeWidgetTypes,
    setIsEditing,
    handleLayoutChange,
    addWidget,
    removeWidget,
    toggleWidget,
    resetLayout,
    saveLayout,
  };
}
