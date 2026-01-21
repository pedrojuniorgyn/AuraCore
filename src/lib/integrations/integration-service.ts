/**
 * Serviço de integrações
 * @module lib/integrations/integration-service
 */

import type {
  Integration,
  IntegrationProvider,
  IntegrationConfigData,
  IntegrationLog,
  Webhook,
  IntegrationPayload,
  IntegrationEventType,
} from './integration-types';

class IntegrationService {
  // Integrations CRUD
  async getIntegrations(): Promise<Integration[]> {
    const response = await fetch('/api/strategic/integrations');
    if (!response.ok) throw new Error('Failed to fetch integrations');
    const data = await response.json();
    return data.integrations || [];
  }

  async getIntegration(id: string): Promise<Integration | null> {
    const response = await fetch(`/api/strategic/integrations/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch integration');
    return response.json();
  }

  async saveIntegration(config: IntegrationConfigData & { type: IntegrationProvider; name: string }): Promise<Integration> {
    const response = await fetch('/api/strategic/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to save integration');
    const data = await response.json();
    return data.integration;
  }

  async updateIntegration(id: string, config: Partial<IntegrationConfigData>): Promise<Integration> {
    const response = await fetch(`/api/strategic/integrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update integration');
    return response.json();
  }

  async deleteIntegration(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/integrations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete integration');
  }

  async testConnection(config: IntegrationConfigData & { type: IntegrationProvider }): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/api/strategic/integrations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  async toggleIntegration(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/integrations/${id}/toggle`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to toggle integration');
  }

  // Webhooks
  async getWebhooks(): Promise<Webhook[]> {
    const response = await fetch('/api/strategic/integrations/webhook');
    if (!response.ok) throw new Error('Failed to fetch webhooks');
    const data = await response.json();
    return data.webhooks || [];
  }

  async createWebhook(webhook: Partial<Webhook>): Promise<Webhook> {
    const response = await fetch('/api/strategic/integrations/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook),
    });
    if (!response.ok) throw new Error('Failed to create webhook');
    return response.json();
  }

  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook> {
    const response = await fetch(`/api/strategic/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update webhook');
    return response.json();
  }

  async deleteWebhook(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/webhooks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete webhook');
  }

  async testWebhook(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const response = await fetch(`/api/strategic/webhooks/${id}/test`, {
      method: 'POST',
    });
    return response.json();
  }

  // Logs
  async getLogs(filters?: { provider?: IntegrationProvider; integrationId?: string; limit?: number }): Promise<IntegrationLog[]> {
    const params = new URLSearchParams();
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.integrationId) params.append('integrationId', filters.integrationId);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`/api/strategic/integrations/logs?${params}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    return data.logs || [];
  }

  // Generate payload preview
  generatePayloadPreview(event: IntegrationEventType): IntegrationPayload {
    const sampleData: Record<IntegrationEventType, Record<string, unknown>> = {
      'kpi.critical': {
        kpiId: 'kpi-123',
        kpiName: 'Taxa OTD',
        code: 'KPI-CLI-001',
        value: 82,
        target: 95,
        threshold: 90,
        status: 'critical',
        perspective: 'customer',
      },
      'kpi.warning': {
        kpiId: 'kpi-123',
        kpiName: 'Margem Bruta',
        value: 28,
        target: 35,
        status: 'warning',
      },
      'kpi.updated': {
        kpiId: 'kpi-123',
        kpiName: 'NPS',
        previousValue: 45,
        newValue: 52,
        updatedBy: 'João Silva',
      },
      'kpi.target_achieved': {
        kpiId: 'kpi-123',
        kpiName: 'Satisfação Cliente',
        value: 90,
        target: 85,
      },
      'action_plan.created': {
        planId: 'plan-456',
        planName: 'Melhorar OTD Região Sul',
        responsible: 'Maria Santos',
        dueDate: '2026-02-15',
      },
      'action_plan.overdue': {
        planId: 'plan-456',
        planName: 'Reduzir custos logísticos',
        daysOverdue: 5,
        responsible: 'Pedro Alves',
      },
      'action_plan.completed': {
        planId: 'plan-456',
        planName: 'Implementar novo WMS',
        completedBy: 'Ana Costa',
        duration: 45,
      },
      'action_plan.status_changed': {
        planId: 'plan-456',
        planName: 'Otimizar rotas',
        previousStatus: 'not_started',
        newStatus: 'in_progress',
      },
      'goal.achieved': {
        goalId: 'goal-789',
        goalName: 'Q1 2026 - Vendas',
        achievement: 105,
      },
      'goal.progress_updated': {
        goalId: 'goal-789',
        goalName: 'Q1 2026 - Vendas',
        progress: 75,
      },
      'pdca.phase_changed': {
        cycleId: 'pdca-101',
        cycleName: 'Melhoria Qualidade',
        previousPhase: 'plan',
        newPhase: 'do',
      },
      'pdca.completed': {
        cycleId: 'pdca-101',
        cycleName: 'Melhoria Qualidade',
        duration: 35,
        result: 'success',
      },
      'report.generated': {
        reportId: 'report-202',
        reportName: 'Relatório Semanal KPIs',
        type: 'weekly',
        downloadUrl: 'https://...',
      },
      'comment.created': {
        commentId: 'comment-303',
        entityType: 'kpi',
        entityName: 'Taxa OTD',
        author: 'João Silva',
        preview: 'Precisamos focar nesse KPI...',
      },
      'mention.received': {
        commentId: 'comment-303',
        mentionedUser: 'maria@empresa.com',
        author: 'João Silva',
        entityType: 'kpi',
        entityName: 'Taxa OTD',
      },
      'achievement.unlocked': {
        achievementId: 'ach-404',
        achievementName: 'Estrategista',
        description: 'Criou 10 KPIs',
        user: 'João Silva',
      },
    };

    return {
      event,
      timestamp: new Date().toISOString(),
      organizationId: 1,
      data: sampleData[event] || {},
      metadata: {
        triggeredBy: 'preview',
        url: 'https://app.auracore.com/strategic/kpis/kpi-123',
      },
    };
  }
}

export const integrationService = new IntegrationService();
