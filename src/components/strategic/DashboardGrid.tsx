'use client';

import { useMemo, ReactNode, CSSProperties, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

// Props do componente GridLayout
interface GridLayoutProps {
  className?: string;
  layout: LayoutItem[];
  cols: number;
  rowHeight: number;
  width: number;
  isDraggable: boolean;
  isResizable: boolean;
  draggableHandle?: string;
  onLayoutChange: (layout: readonly LayoutItem[]) => void;
  margin?: [number, number];
  containerPadding?: [number, number];
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

// FIX Bug 1: Dynamic import to avoid SSR issues in Next.js 15
 
const ReactGridLayout = dynamic<GridLayoutProps>(
  () => import('react-grid-layout').then(mod => mod.default || mod) as Promise<ComponentType<GridLayoutProps>>,
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    ),
  }
);
import { DashboardWidget } from './DashboardWidget';
import { WidgetType } from './WidgetPicker';
import { 
  HealthScoreWidget, 
  AlertsWidget, 
  KpiSummaryWidget, 
  ActionsWidget,
  TrendChartWidget,
  AuroraInsightWidget,
  type WidgetAlert,
  type KpiPerspective,
  type WidgetAction,
  type TrendPoint,
} from './widgets';

export interface WidgetConfig {
  i: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardData {
  healthScore: number;
  previousHealthScore: number;
  lastUpdate: string;
  alerts: WidgetAlert[];
  perspectives: KpiPerspective[];
  actions: WidgetAction[];
  trendData: TrendPoint[];
  auroraInsight?: string;
}

interface Props {
  widgets: WidgetConfig[];
  data: DashboardData | null;
  isEditing: boolean;
  onLayoutChange: (layout: readonly LayoutItem[]) => void;
  onRemoveWidget: (id: string) => void;
  containerWidth?: number;
}

const widgetTitles: Record<WidgetType, { title: string; icon: string }> = {
  'health-score': { title: 'Health Score', icon: '❤️' },
  'alerts': { title: 'Alertas Críticos', icon: '🚨' },
  'trend-chart': { title: 'Tendência Semanal', icon: '📊' },
  'kpi-summary': { title: 'KPIs por Perspectiva', icon: '🎯' },
  'actions': { title: 'Top Ações', icon: '✅' },
  'aurora-insight': { title: 'Aurora AI', icon: '🤖' },
  'achievements': { title: 'Conquistas', icon: '🏆' },
  'pdca-active': { title: 'Ciclos PDCA', icon: '🔄' },
};

// FIX Bug 3: Fallback para tipos de widget desconhecidos
const defaultWidgetConfig = { title: 'Widget', icon: '📦' };

export function DashboardGrid({ 
  widgets, 
  data, 
  isEditing, 
  onLayoutChange, 
  onRemoveWidget,
  containerWidth = 1200,
}: Props) {
  const layout = useMemo(() => 
    widgets.map(w => ({
      i: w.i,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: 1,
      minH: 1,
      maxW: 3,
      maxH: 4,
    })), [widgets]
  );

  const renderWidgetContent = (type: WidgetType) => {
    if (!data) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (type) {
      case 'health-score':
        return (
          <HealthScoreWidget
            score={data.healthScore}
            previousScore={data.previousHealthScore}
            lastUpdate={data.lastUpdate}
          />
        );
      case 'alerts':
        return <AlertsWidget alerts={data.alerts} />;
      case 'kpi-summary':
        return <KpiSummaryWidget perspectives={data.perspectives} />;
      case 'actions':
        return <ActionsWidget actions={data.actions} />;
      case 'trend-chart':
        return (
          <TrendChartWidget 
            data={data.trendData} 
            currentValue={data.healthScore}
            targetValue={80}
          />
        );
      case 'aurora-insight':
        return <AuroraInsightWidget insight={data.auroraInsight} />;
      case 'achievements':
        return (
          <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm">
            <span className="text-3xl mb-2">🏆</span>
            <p>Conquistas em breve</p>
          </div>
        );
      case 'pdca-active':
        return (
          <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm">
            <span className="text-3xl mb-2">🔄</span>
            <p>PDCA em breve</p>
          </div>
        );
      default:
        return <div className="text-white/40 text-center">Widget não encontrado</div>;
    }
  };

  return (
    <div className="dashboard-grid-container">
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={3}
        rowHeight={150}
        width={containerWidth}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget) => {
          // FIX Bug 3: Usar fallback para tipos desconhecidos
          const config = widgetTitles[widget.type] || defaultWidgetConfig;
          
          return (
            <div key={widget.i}>
              <DashboardWidget
                id={widget.i}
                title={config.title}
                icon={config.icon}
                isEditing={isEditing}
                onRemove={() => onRemoveWidget(widget.i)}
              >
                {renderWidgetContent(widget.type)}
              </DashboardWidget>
            </div>
          );
        })}
      </ReactGridLayout>

      <style jsx global>{`
        .dashboard-grid-container .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .dashboard-grid-container .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .dashboard-grid-container .react-grid-item.resizing {
          z-index: 1;
          will-change: width, height;
        }
        .dashboard-grid-container .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
        }
        .dashboard-grid-container .react-grid-item.dropping {
          visibility: hidden;
        }
        .dashboard-grid-container .react-grid-item.react-grid-placeholder {
          background: rgba(168, 85, 247, 0.2);
          border: 2px dashed rgba(168, 85, 247, 0.5);
          border-radius: 1rem;
          opacity: 1;
          transition-duration: 100ms;
          z-index: 2;
        }
        .dashboard-grid-container .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .dashboard-grid-container .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 5px;
          bottom: 5px;
          width: 10px;
          height: 10px;
          border-right: 2px solid rgba(168, 85, 247, 0.5);
          border-bottom: 2px solid rgba(168, 85, 247, 0.5);
        }
        .dashboard-grid-container .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
      `}</style>
    </div>
  );
}
