'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics/analytics-service';

/**
 * Hook para tracking de analytics
 *
 * @example
 * ```tsx
 * const { trackFeature, trackKpiView } = useAnalytics();
 *
 * // Em um handler
 * trackFeature('dashboard', 'widget_added', { type: 'health-score' });
 * trackKpiView('kpi-123', 'Taxa de Entrega');
 * ```
 */
export function useAnalytics() {
  const pathname = usePathname();
  const startTimeRef = useRef<number | null>(null);

  // Track page views automaticamente
  useEffect(() => {
    startTimeRef.current = Date.now();
    analytics.pageView(pathname);

    return () => {
      if (startTimeRef.current !== null) {
        const timeSpent = Date.now() - startTimeRef.current;
        analytics.timing('page', 'time_on_page', timeSpent);
      }
    };
  }, [pathname]);

  // Tracking de features
  const trackFeature = useCallback(
    (feature: string, action: string, props?: Record<string, unknown>) => {
      analytics.featureUsed(feature, action, props);
    },
    []
  );

  // Tracking de KPIs
  const trackKpiView = useCallback((kpiId: string, kpiName: string) => {
    analytics.kpiViewed(kpiId, kpiName);
  }, []);

  const trackKpiUpdate = useCallback(
    (kpiId: string, kpiName: string, value: number) => {
      analytics.kpiUpdated(kpiId, kpiName, value);
    },
    []
  );

  const trackKpiCreate = useCallback((kpiId: string, kpiName: string) => {
    analytics.kpiCreated(kpiId, kpiName);
  }, []);

  // Tracking de Action Plans
  const trackActionPlanCreate = useCallback((planId: string, planName: string) => {
    analytics.actionPlanCreated(planId, planName);
  }, []);

  const trackActionPlanUpdate = useCallback((planId: string, status: string) => {
    analytics.actionPlanUpdated(planId, status);
  }, []);

  const trackActionPlanComplete = useCallback((planId: string, planName: string) => {
    analytics.actionPlanCompleted(planId, planName);
  }, []);

  // Tracking de Dashboard
  const trackWidgetAdd = useCallback((widgetType: string) => {
    analytics.widgetAdded(widgetType);
  }, []);

  const trackWidgetRemove = useCallback((widgetType: string) => {
    analytics.widgetRemoved(widgetType);
  }, []);

  const trackLayoutChange = useCallback(() => {
    analytics.layoutChanged();
  }, []);

  // Tracking de busca
  const trackSearch = useCallback(
    (query: string, category: string, resultsCount: number) => {
      analytics.searchPerformed(query, category, resultsCount);
    },
    []
  );

  // Tracking de erros
  const trackError = useCallback((error: string, context: string) => {
    analytics.errorOccurred(error, context);
  }, []);

  return {
    trackFeature,
    trackKpiView,
    trackKpiUpdate,
    trackKpiCreate,
    trackActionPlanCreate,
    trackActionPlanUpdate,
    trackActionPlanComplete,
    trackWidgetAdd,
    trackWidgetRemove,
    trackLayoutChange,
    trackSearch,
    trackError,
  };
}
