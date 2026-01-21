/**
 * Tipos para o Dashboard Builder
 * @module lib/dashboard/dashboard-types
 */

export type WidgetType =
  | 'kpi_card'
  | 'kpi_chart'
  | 'kpi_gauge'
  | 'kpi_table'
  | 'goal_progress'
  | 'goal_bars'
  | 'okr_tree'
  | 'okr_progress'
  | 'action_plan_list'
  | 'action_plan_status'
  | 'pdca_cycle'
  | 'alerts'
  | 'leaderboard'
  | 'streak'
  | 'achievements'
  | 'activity_feed'
  | 'text'
  | 'image';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  config: WidgetConfig;
  isLocked: boolean;
}

export type WidgetConfig =
  | KpiWidgetConfig
  | GoalWidgetConfig
  | OkrWidgetConfig
  | ActionPlanWidgetConfig
  | LeaderboardWidgetConfig
  | StreakWidgetConfig
  | TextWidgetConfig
  | GenericWidgetConfig;

export interface KpiWidgetConfig {
  type: 'kpi_card' | 'kpi_chart' | 'kpi_gauge' | 'kpi_table';
  kpiId?: string;
  kpiIds?: string[];
  showTrend: boolean;
  showVariation: boolean;
  showTarget: boolean;
  showStatus: boolean;
  chartType?: 'line' | 'bar' | 'area';
  period?: 'week' | 'month' | 'quarter' | 'year';
  themeColor?: string;
}

export interface GoalWidgetConfig {
  type: 'goal_progress' | 'goal_bars';
  goalIds?: string[];
  perspective?: string;
  showPercentage: boolean;
  showValue: boolean;
}

export interface OkrWidgetConfig {
  type: 'okr_tree' | 'okr_progress';
  okrId?: string;
  level?: 'corporate' | 'department' | 'team' | 'individual';
  periodLabel?: string;
  showKeyResults: boolean;
}

export interface ActionPlanWidgetConfig {
  type: 'action_plan_list' | 'action_plan_status';
  status?: string[];
  responsible?: string;
  limit?: number;
  showOverdue: boolean;
}

export interface LeaderboardWidgetConfig {
  type: 'leaderboard';
  period: 'week' | 'month' | 'quarter' | 'all_time';
  limit: number;
  showCurrentUser: boolean;
}

export interface StreakWidgetConfig {
  type: 'streak';
  showRecord: boolean;
  showCalendar: boolean;
}

export interface TextWidgetConfig {
  type: 'text';
  content: string;
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
}

export interface GenericWidgetConfig {
  type: string;
  [key: string]: unknown;
}

export type DashboardVisibility = 'private' | 'team' | 'public';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  ownerId: string;
  ownerName: string;
  visibility: DashboardVisibility;
  isDefault: boolean;
  refreshInterval?: number;
  organizationId: number;
  branchId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardFilters {
  visibility?: DashboardVisibility;
  ownerId?: string;
  search?: string;
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  category: 'kpi' | 'goals' | 'plans' | 'gamification' | 'other';
  defaultSize: WidgetPosition;
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  defaultConfig: Partial<WidgetConfig>;
}

export const SIZE_PRESETS: Record<WidgetSize, WidgetPosition> = {
  small: { x: 0, y: 0, w: 3, h: 2 },
  medium: { x: 0, y: 0, w: 6, h: 3 },
  large: { x: 0, y: 0, w: 9, h: 4 },
  full: { x: 0, y: 0, w: 12, h: 4 },
};

export const VISIBILITY_LABELS: Record<DashboardVisibility, string> = {
  private: 'Privado',
  team: 'Meu Time',
  public: 'Público',
};
