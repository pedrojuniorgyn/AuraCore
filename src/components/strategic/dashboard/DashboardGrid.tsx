'use client';

import { useCallback, useMemo, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { Widget, WidgetType } from '@/lib/dashboard/dashboard-types';
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry';
import { WidgetWrapper } from './WidgetWrapper';
import { KpiCardWidget } from './widgets/KpiCardWidget';
import { KpiChartWidget } from './widgets/KpiChartWidget';
import { GoalProgressWidget } from './widgets/GoalProgressWidget';
import { ActionPlanWidget } from './widgets/ActionPlanWidget';
import { OKRWidget } from './widgets/OKRWidget';
import { AlertsWidget } from './widgets/AlertsWidget';
import { LeaderboardWidget } from './widgets/LeaderboardWidget';
import { StreakWidget } from './widgets/StreakWidget';
import { Layout as LayoutIcon } from 'lucide-react';

// Custom types for react-grid-layout
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
  static?: boolean;
}

interface GridLayoutProps {
  className?: string;
  layout: LayoutItem[];
  cols: number;
  rowHeight: number;
  width: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  isDroppable?: boolean;
  onLayoutChange?: (layout: readonly LayoutItem[]) => void;
  onDrop?: (layout: readonly LayoutItem[], item: LayoutItem, e: Event) => void;
  margin?: [number, number];
  containerPadding?: [number, number];
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  droppingItem?: LayoutItem;
  children: React.ReactNode;
}

// Dynamic import to avoid SSR issues
const ReactGridLayout = dynamic<GridLayoutProps>(
  () =>
    import('react-grid-layout').then(
      (mod) => mod.default || mod
    ) as Promise<ComponentType<GridLayoutProps>>,
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

interface Props {
  widgets: Widget[];
  selectedWidget: Widget | null;
  isEditMode: boolean;
  onSelectWidget: (widget: Widget | null) => void;
  onRemoveWidget: (id: string) => void;
  onConfigureWidget: (widget: Widget) => void;
  onDuplicateWidget: (id: string) => void;
  onToggleLock: (id: string) => void;
  onLayoutChange: (id: string, position: { x: number; y: number; w: number; h: number }) => void;
  onDropWidget: (type: WidgetType, position: { x: number; y: number }) => void;
}

const GRID_COLS = 12;
const ROW_HEIGHT = 80;

export function DashboardBuilderGrid({
  widgets,
  selectedWidget,
  isEditMode,
  onSelectWidget,
  onRemoveWidget,
  onConfigureWidget,
  onDuplicateWidget,
  onToggleLock,
  onLayoutChange,
  onDropWidget,
}: Props) {
  const layout: LayoutItem[] = useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.position.x,
        y: w.position.y,
        w: w.position.w,
        h: w.position.h,
        static: w.isLocked,
        minW: WIDGET_REGISTRY[w.type]?.minSize.w || 2,
        minH: WIDGET_REGISTRY[w.type]?.minSize.h || 2,
        maxW: WIDGET_REGISTRY[w.type]?.maxSize.w || 12,
        maxH: WIDGET_REGISTRY[w.type]?.maxSize.h || 8,
      })),
    [widgets]
  );

  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      newLayout.forEach((item) => {
        const widget = widgets.find((w) => w.id === item.i);
        if (
          widget &&
          (widget.position.x !== item.x ||
            widget.position.y !== item.y ||
            widget.position.w !== item.w ||
            widget.position.h !== item.h)
        ) {
          onLayoutChange(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
        }
      });
    },
    [widgets, onLayoutChange]
  );

  const handleDrop = useCallback(
    (_layout: readonly LayoutItem[], item: LayoutItem, e: Event) => {
      const dragEvent = e as unknown as DragEvent;
      const widgetType = dragEvent.dataTransfer?.getData('widgetType') as WidgetType;
      if (widgetType) {
        onDropWidget(widgetType, { x: item.x, y: item.y });
      }
    },
    [onDropWidget]
  );

  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case 'kpi_card':
        return <KpiCardWidget widget={widget} />;
      case 'kpi_chart':
        return <KpiChartWidget widget={widget} />;
      case 'goal_progress':
      case 'goal_bars':
        return <GoalProgressWidget widget={widget} />;
      case 'action_plan_list':
      case 'action_plan_status':
        return <ActionPlanWidget widget={widget} />;
      case 'okr_tree':
      case 'okr_progress':
        return <OKRWidget widget={widget} />;
      case 'alerts':
        return <AlertsWidget widget={widget} />;
      case 'leaderboard':
        return <LeaderboardWidget widget={widget} />;
      case 'streak':
        return <StreakWidget widget={widget} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-white/40">
            <span className="text-3xl">{WIDGET_REGISTRY[widget.type]?.icon || '📦'}</span>
          </div>
        );
    }
  };

  if (widgets.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const widgetType = e.dataTransfer.getData('widgetType') as WidgetType;
          if (widgetType) {
            onDropWidget(widgetType, { x: 0, y: 0 });
          }
        }}
      >
        <div className="text-center p-8 border-2 border-dashed border-white/20 rounded-2xl">
          <LayoutIcon className="mx-auto mb-4 text-white/30" size={48} />
          <p className="text-white/50 text-lg mb-2">Seu dashboard está vazio</p>
          <p className="text-white/30 text-sm">
            Arraste widgets da biblioteca à esquerda para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-auto" onDragOver={(e) => e.preventDefault()}>
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        width={1200}
        onLayoutChange={handleLayoutChange}
        onDrop={handleDrop}
        isDroppable={isEditMode}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        droppingItem={{ i: 'drop', w: 3, h: 2, x: 0, y: 0 }}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetWrapper
              widget={widget}
              isSelected={selectedWidget?.id === widget.id}
              isEditMode={isEditMode}
              onSelect={() => onSelectWidget(widget)}
              onRemove={() => onRemoveWidget(widget.id)}
              onConfigure={() => onConfigureWidget(widget)}
              onDuplicate={() => onDuplicateWidget(widget.id)}
              onToggleLock={() => onToggleLock(widget.id)}
            >
              {renderWidgetContent(widget)}
            </WidgetWrapper>
          </div>
        ))}
      </ReactGridLayout>

      <style jsx global>{`
        .layout .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .layout .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .layout .react-grid-item.resizing {
          z-index: 1;
          will-change: width, height;
        }
        .layout .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
        }
        .layout .react-grid-item.react-grid-placeholder {
          background: rgba(168, 85, 247, 0.2);
          border: 2px dashed rgba(168, 85, 247, 0.5);
          border-radius: 1rem;
          opacity: 1;
        }
        .layout .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .layout .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 5px;
          bottom: 5px;
          width: 10px;
          height: 10px;
          border-right: 2px solid rgba(168, 85, 247, 0.5);
          border-bottom: 2px solid rgba(168, 85, 247, 0.5);
        }
        .layout .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
      `}</style>
    </div>
  );
}
