/**
 * Tipos para o sistema de analytics
 * @module lib/analytics/analytics-types
 */

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface OverviewMetrics {
  activeUsers: MetricValue;
  dailySessions: MetricValue;
  kpisUpdated: MetricValue;
  actionsCreated: MetricValue;
  goalsAchieved: MetricValue;
  avgSessionDuration: MetricValue;
}

export interface EngagementData {
  date: string;
  sessions: number;
  pageViews: number;
  interactions: number;
  avgDuration: number;
}

export interface FeatureUsage {
  feature: string;
  label: string;
  usage: number;
  sessions: number;
  avgTimeSpent: number;
}

export interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number;
  sessions: number;
}

export interface FunnelStep {
  id: string;
  name: string;
  count: number;
  percent: number;
  dropoff: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  relatedEntity?: {
    type: 'kpi' | 'action_plan' | 'goal' | 'user';
    id: string;
    name: string;
  };
  suggestedAction?: string;
  actionUrl?: string;
}

export interface AnalyticsEvent {
  event: string;
  category: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsData {
  metrics: OverviewMetrics;
  engagement: EngagementData[];
  featureUsage: FeatureUsage[];
  heatmap: HeatmapCell[];
  funnel: FunnelStep[];
  insights: PredictiveInsight[];
}

export interface TrackEventInput {
  events: AnalyticsEvent[];
}

export interface AnalyticsQueryParams {
  timeRange: string;
  organizationId: number;
  branchId: number;
}

// Constantes
export const TIME_RANGES = {
  '7d': { days: 7, label: 'Últimos 7 dias' },
  '30d': { days: 30, label: 'Últimos 30 dias' },
  '90d': { days: 90, label: 'Últimos 90 dias' },
  'ytd': { days: 365, label: 'Este ano' },
} as const;

export type TimeRangeKey = keyof typeof TIME_RANGES;
