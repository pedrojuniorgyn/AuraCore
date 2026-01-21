'use client';

import { useState, useCallback } from 'react';
import type {
  Widget,
  WidgetPosition,
  Dashboard,
  WidgetConfig,
  WidgetType,
} from '@/lib/dashboard/dashboard-types';
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry';

interface UseDashboardBuilderReturn {
  widgets: Widget[];
  selectedWidget: Widget | null;
  isDragging: boolean;
  hasChanges: boolean;
  addWidget: (type: WidgetType, position?: Partial<WidgetPosition>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  moveWidget: (id: string, position: WidgetPosition) => void;
  resizeWidget: (id: string, size: { w: number; h: number }) => void;
  duplicateWidget: (id: string) => void;
  selectWidget: (widget: Widget | null) => void;
  setDragging: (dragging: boolean) => void;
  loadLayout: (dashboard: Dashboard) => void;
  clearLayout: () => void;
  getLayout: () => Widget[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useDashboardBuilder(initialWidgets: Widget[] = []): UseDashboardBuilderReturn {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // History state instead of refs for undo/redo
  const [history, setHistory] = useState<Widget[][]>([initialWidgets]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = useCallback(
    (newWidgets: Widget[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push([...newWidgets]);
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  const addWidget = useCallback(
    (type: WidgetType, position?: Partial<WidgetPosition>) => {
      const definition = WIDGET_REGISTRY[type];
      if (!definition) return;

      const newWidget: Widget = {
        id: `widget-${Date.now()}`,
        type,
        title: definition.name,
        position: {
          ...definition.defaultSize,
          ...position,
        },
        config: definition.defaultConfig as WidgetConfig,
        isLocked: false,
      };

      setWidgets((prev) => {
        const updated = [...prev, newWidget];
        saveToHistory(updated);
        return updated;
      });
      setSelectedWidget(newWidget);
      setHasChanges(true);
    },
    [saveToHistory]
  );

  const removeWidget = useCallback(
    (id: string) => {
      setWidgets((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        saveToHistory(updated);
        return updated;
      });
      setSelectedWidget(null);
      setHasChanges(true);
    },
    [saveToHistory]
  );

  const updateWidget = useCallback(
    (id: string, updates: Partial<Widget>) => {
      setWidgets((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
        saveToHistory(updated);
        return updated;
      });
      setHasChanges(true);
    },
    [saveToHistory]
  );

  const moveWidget = useCallback(
    (id: string, position: WidgetPosition) => {
      setWidgets((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, position } : w));
        saveToHistory(updated);
        return updated;
      });
      setHasChanges(true);
    },
    [saveToHistory]
  );

  const resizeWidget = useCallback(
    (id: string, size: { w: number; h: number }) => {
      setWidgets((prev) => {
        const updated = prev.map((w) =>
          w.id === id ? { ...w, position: { ...w.position, ...size } } : w
        );
        saveToHistory(updated);
        return updated;
      });
      setHasChanges(true);
    },
    [saveToHistory]
  );

  const duplicateWidget = useCallback(
    (id: string) => {
      const widget = widgets.find((w) => w.id === id);
      if (!widget) return;

      const newWidget: Widget = {
        ...widget,
        id: `widget-${Date.now()}`,
        position: {
          ...widget.position,
          x: Math.min(widget.position.x + 1, 11),
          y: widget.position.y + 1,
        },
      };

      setWidgets((prev) => {
        const updated = [...prev, newWidget];
        saveToHistory(updated);
        return updated;
      });
      setSelectedWidget(newWidget);
      setHasChanges(true);
    },
    [widgets, saveToHistory]
  );

  const selectWidget = useCallback((widget: Widget | null) => {
    setSelectedWidget(widget);
  }, []);

  const setDraggingState = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  const loadLayout = useCallback((dashboard: Dashboard) => {
    setWidgets(dashboard.widgets);
    setHistory([dashboard.widgets]);
    setHistoryIndex(0);
    setHasChanges(false);
    setSelectedWidget(null);
  }, []);

  const clearLayout = useCallback(() => {
    setWidgets([]);
    saveToHistory([]);
    setSelectedWidget(null);
    setHasChanges(true);
  }, [saveToHistory]);

  const getLayout = useCallback(() => {
    return widgets;
  }, [widgets]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setWidgets([...history[newIndex]]);
      setHasChanges(true);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWidgets([...history[newIndex]]);
      setHasChanges(true);
    }
  }, [historyIndex, history]);

  return {
    widgets,
    selectedWidget,
    isDragging,
    hasChanges,
    addWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    resizeWidget,
    duplicateWidget,
    selectWidget,
    setDragging: setDraggingState,
    loadLayout,
    clearLayout,
    getLayout,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
