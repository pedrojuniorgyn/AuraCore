'use client';

import type { AnalyticsEvent } from './analytics-types';

/**
 * Serviço de analytics client-side
 * Coleta e envia eventos para o backend
 */
class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Habilita ou desabilita tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Evento genérico de tracking
   */
  track(event: string, category: string, properties?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      properties,
      timestamp: new Date(),
      sessionId: this.sessionId,
    };

    this.queue.push(analyticsEvent);
    this.scheduleFlush();
  }

  // ======================================
  // Eventos de Navegação
  // ======================================

  pageView(page: string, properties?: Record<string, unknown>): void {
    this.track('page_view', 'navigation', { page, ...properties });
  }

  // ======================================
  // Eventos de Feature
  // ======================================

  featureUsed(feature: string, action: string, properties?: Record<string, unknown>): void {
    this.track('feature_used', feature, { action, ...properties });
  }

  // ======================================
  // Eventos de KPI
  // ======================================

  kpiViewed(kpiId: string, kpiName: string): void {
    this.track('kpi_viewed', 'kpi', { kpiId, kpiName });
  }

  kpiUpdated(kpiId: string, kpiName: string, value: number): void {
    this.track('kpi_updated', 'kpi', { kpiId, kpiName, value });
  }

  kpiCreated(kpiId: string, kpiName: string): void {
    this.track('kpi_created', 'kpi', { kpiId, kpiName });
  }

  // ======================================
  // Eventos de Action Plan
  // ======================================

  actionPlanCreated(planId: string, planName: string): void {
    this.track('action_plan_created', 'action_plan', { planId, planName });
  }

  actionPlanUpdated(planId: string, status: string): void {
    this.track('action_plan_updated', 'action_plan', { planId, status });
  }

  actionPlanCompleted(planId: string, planName: string): void {
    this.track('action_plan_completed', 'action_plan', { planId, planName });
  }

  // ======================================
  // Eventos de Dashboard
  // ======================================

  widgetAdded(widgetType: string): void {
    this.track('widget_added', 'dashboard', { widgetType });
  }

  widgetRemoved(widgetType: string): void {
    this.track('widget_removed', 'dashboard', { widgetType });
  }

  layoutChanged(): void {
    this.track('layout_changed', 'dashboard', {});
  }

  // ======================================
  // Eventos de Busca
  // ======================================

  searchPerformed(query: string, category: string, resultsCount: number): void {
    this.track('search_performed', 'search', { query, category, resultsCount });
  }

  // ======================================
  // Eventos de Erro
  // ======================================

  errorOccurred(error: string, context: string): void {
    this.track('error_occurred', 'error', { error, context });
  }

  // ======================================
  // Timing
  // ======================================

  timing(category: string, variable: string, time: number): void {
    this.track('timing', category, { variable, time });
  }

  // ======================================
  // Flush
  // ======================================

  private scheduleFlush(): void {
    if (this.flushTimeout) return;

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 1000);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.flushTimeout = null;

    try {
      await fetch('/api/strategic/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-add events to queue on failure
      this.queue.unshift(...events);
      console.error('Failed to flush analytics:', error);
    }
  }

  /**
   * Força envio imediato dos eventos
   */
  async forceFlush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    await this.flush();
  }
}

// Singleton
export const analytics = new AnalyticsService();
