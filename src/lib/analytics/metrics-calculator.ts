/**
 * Calculadora de métricas de analytics
 * @module lib/analytics/metrics-calculator
 */

import type {
  MetricValue,
  OverviewMetrics,
  EngagementData,
  FeatureUsage,
  HeatmapCell,
  FunnelStep,
  PredictiveInsight,
  AnalyticsData,
} from './analytics-types';

/**
 * Calcula valor de métrica com comparação
 */
export function calculateMetricValue(
  current: number,
  previous: number
): MetricValue {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 1) trend = 'up';
  else if (changePercent < -1) trend = 'down';

  return {
    current,
    previous,
    change,
    changePercent,
    trend,
  };
}

/**
 * Gera dados mock de analytics para desenvolvimento
 */
export function generateMockAnalyticsData(
  timeRange: string,
  organizationId: number
): AnalyticsData {
  // Suprimir warnings de variáveis não usadas
  void timeRange;
  void organizationId;

  // Métricas de overview
  const metrics: OverviewMetrics = {
    activeUsers: calculateMetricValue(156, 139),
    dailySessions: calculateMetricValue(423, 392),
    kpisUpdated: calculateMetricValue(892, 920),
    actionsCreated: calculateMetricValue(67, 54),
    goalsAchieved: calculateMetricValue(12, 8),
    avgSessionDuration: calculateMetricValue(8.5, 7.2),
  };

  // Dados de engajamento (últimos 14 dias)
  const engagement: EngagementData[] = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return {
      date: date.toISOString().split('T')[0],
      sessions: 300 + Math.floor(Math.random() * 150),
      pageViews: 1200 + Math.floor(Math.random() * 500),
      interactions: 800 + Math.floor(Math.random() * 400),
      avgDuration: 5 + Math.random() * 8,
    };
  });

  // Uso de features
  const featureUsage: FeatureUsage[] = [
    { feature: 'dashboard', label: 'Dashboard', usage: 89, sessions: 380, avgTimeSpent: 12.5 },
    { feature: 'kpis', label: 'KPIs', usage: 67, sessions: 285, avgTimeSpent: 8.2 },
    { feature: 'action-plans', label: 'Planos de Ação', usage: 45, sessions: 190, avgTimeSpent: 15.3 },
    { feature: 'pdca', label: 'PDCA', usage: 23, sessions: 98, avgTimeSpent: 18.7 },
    { feature: 'reports', label: 'Relatórios', usage: 18, sessions: 76, avgTimeSpent: 6.4 },
    { feature: 'war-room', label: 'War Room', usage: 12, sessions: 51, avgTimeSpent: 22.1 },
  ];

  // Heatmap de atividade
  const heatmap: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (const hour of [6, 9, 12, 15, 18, 21]) {
      // Mais atividade em dias úteis e horário comercial
      const isWeekday = day >= 1 && day <= 5;
      const isBusinessHour = hour >= 9 && hour <= 18;
      let baseValue = 10;
      if (isWeekday) baseValue += 40;
      if (isBusinessHour) baseValue += 50;
      
      heatmap.push({
        day,
        hour,
        value: baseValue + Math.floor(Math.random() * 30),
        sessions: Math.floor(baseValue * 0.8),
      });
    }
  }

  // Funil de conversão
  const funnel: FunnelStep[] = [
    { id: 'visit', name: 'Visitou KPIs', count: 1000, percent: 100, dropoff: 0 },
    { id: 'view', name: 'Visualizou Detalhes', count: 670, percent: 67, dropoff: 33 },
    { id: 'create', name: 'Criou KPI', count: 450, percent: 45, dropoff: 22 },
    { id: 'target', name: 'Definiu Meta', count: 310, percent: 31, dropoff: 14 },
    { id: 'action', name: 'Criou Ação', count: 230, percent: 23, dropoff: 8 },
  ];

  // Insights preditivos
  const insights: PredictiveInsight[] = [
    {
      id: 'insight-1',
      type: 'warning',
      title: 'KPI em Risco',
      description: 'O KPI "OTD" tem 73% de chance de ficar crítico na próxima semana se a tendência continuar.',
      confidence: 0.73,
      relatedEntity: { type: 'kpi', id: 'kpi-123', name: 'Taxa de Entrega no Prazo' },
      suggestedAction: 'Ver KPI',
      actionUrl: '/strategic/kpis/kpi-123',
    },
    {
      id: 'insight-2',
      type: 'warning',
      title: 'Planos de Ação Atrasados',
      description: '5 planos de ação têm alto risco de atraso baseado no progresso atual.',
      confidence: 0.85,
      suggestedAction: 'Ver Planos',
      actionUrl: '/strategic/action-plans?status=at-risk',
    },
    {
      id: 'insight-3',
      type: 'recommendation',
      title: 'Engajamento PDCA Baixo',
      description: 'O engajamento com PDCA caiu 15%. Recomendamos tour de reativação para usuários inativos.',
      confidence: 0.68,
      suggestedAction: 'Configurar Tour',
      actionUrl: '/strategic/settings/onboarding',
    },
    {
      id: 'insight-4',
      type: 'opportunity',
      title: 'Meta Próxima',
      description: '3 KPIs estão a menos de 5% de atingir a meta. Uma pequena ação pode garantir o sucesso.',
      confidence: 0.91,
      suggestedAction: 'Ver KPIs',
      actionUrl: '/strategic/kpis?status=near-target',
    },
  ];

  return {
    metrics,
    engagement,
    featureUsage,
    heatmap,
    funnel,
    insights,
  };
}
