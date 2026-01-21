/**
 * Tipos para o sistema de integrações externas
 * @module lib/integrations/integration-types
 */

export type IntegrationProvider = 'slack' | 'teams' | 'email' | 'webhook' | 'push';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  config: IntegrationConfigData;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  errorMessage?: string;
  stats: {
    totalSent: number;
    successRate: number;
  };
}

export interface IntegrationConfigData {
  webhookUrl?: string;
  channel?: string;
  events: IntegrationEventType[];
  messageFormat?: 'compact' | 'detailed' | 'rich';
  // Slack specific
  workspaceId?: string;
  workspaceName?: string;
  accessToken?: string;
  botUserId?: string;
  // Teams specific
  tenantId?: string;
  teamId?: string;
  teamName?: string;
  // Email specific
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
  recipients?: EmailRecipient[];
  // Webhook specific
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  retryPolicy?: 'none' | '3' | '5';
  secret?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  events: IntegrationEventType[];
}

// Events
export type IntegrationEventType =
  | 'kpi.critical'
  | 'kpi.warning'
  | 'kpi.updated'
  | 'kpi.target_achieved'
  | 'action_plan.created'
  | 'action_plan.overdue'
  | 'action_plan.completed'
  | 'action_plan.status_changed'
  | 'goal.achieved'
  | 'goal.progress_updated'
  | 'pdca.phase_changed'
  | 'pdca.completed'
  | 'report.generated'
  | 'comment.created'
  | 'mention.received'
  | 'achievement.unlocked';

export interface IntegrationEvent {
  type: IntegrationEventType;
  enabled: boolean;
  filters?: Record<string, unknown>;
}

export const EVENT_LABELS: Record<IntegrationEventType, string> = {
  'kpi.critical': 'KPI atingiu valor crítico',
  'kpi.warning': 'KPI em estado de atenção',
  'kpi.updated': 'KPI atualizado',
  'kpi.target_achieved': 'Meta do KPI atingida',
  'action_plan.created': 'Novo plano de ação criado',
  'action_plan.overdue': 'Plano de ação atrasado',
  'action_plan.completed': 'Plano de ação concluído',
  'action_plan.status_changed': 'Status do plano alterado',
  'goal.achieved': 'Meta estratégica atingida',
  'goal.progress_updated': 'Progresso da meta atualizado',
  'pdca.phase_changed': 'Ciclo PDCA mudou de fase',
  'pdca.completed': 'Ciclo PDCA concluído',
  'report.generated': 'Relatório gerado',
  'comment.created': 'Novo comentário',
  'mention.received': 'Nova menção (@)',
  'achievement.unlocked': 'Conquista desbloqueada',
};

export const EVENT_CATEGORIES = {
  kpi: ['kpi.critical', 'kpi.warning', 'kpi.updated', 'kpi.target_achieved'] as IntegrationEventType[],
  action_plan: ['action_plan.created', 'action_plan.overdue', 'action_plan.completed', 'action_plan.status_changed'] as IntegrationEventType[],
  goal: ['goal.achieved', 'goal.progress_updated'] as IntegrationEventType[],
  pdca: ['pdca.phase_changed', 'pdca.completed'] as IntegrationEventType[],
  other: ['report.generated', 'comment.created', 'mention.received', 'achievement.unlocked'] as IntegrationEventType[],
};

// Logs
export interface IntegrationLog {
  id: string;
  integrationId: string;
  provider: IntegrationProvider;
  event: IntegrationEventType | string;
  status: 'success' | 'error' | 'pending' | 'retrying';
  destination: string;
  payload?: Record<string, unknown>;
  response?: {
    statusCode?: number;
    body?: string;
    duration?: number;
  };
  error?: string;
  retryCount: number;
  createdAt: Date;
}

// Webhook specific
export interface Webhook {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  events: IntegrationEventType[];
  retryPolicy: 'none' | '3' | '5';
  secret?: string;
  isActive: boolean;
  lastTriggeredAt?: Date;
  successCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Payload structure sent to integrations
export interface IntegrationPayload {
  event: IntegrationEventType | string;
  timestamp: string;
  organizationId: number;
  data: Record<string, unknown>;
  metadata?: {
    triggeredBy?: string;
    url?: string;
  };
}

// Provider info for UI
export const PROVIDER_INFO: Record<IntegrationProvider, {
  name: string;
  icon: string;
  color: string;
  description: string;
}> = {
  slack: {
    name: 'Slack',
    icon: '💬',
    color: 'green',
    description: 'Receba notificações em canais do Slack',
  },
  teams: {
    name: 'Microsoft Teams',
    icon: '🔷',
    color: 'blue',
    description: 'Receba notificações em canais do Teams',
  },
  email: {
    name: 'Email',
    icon: '📧',
    color: 'purple',
    description: 'Receba notificações por email',
  },
  webhook: {
    name: 'Webhook',
    icon: '🌐',
    color: 'orange',
    description: 'Envie eventos para sistemas externos',
  },
  push: {
    name: 'Push Notification',
    icon: '🔔',
    color: 'pink',
    description: 'Receba notificações no navegador',
  },
};
