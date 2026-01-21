'use client';

import { AIInsightWidget } from '@/components/ai';

type IntegrationsScreen =
  | 'main'
  | 'provider'
  | 'webhooks'
  | 'api-keys'
  | 'logs'
  | 'monitoring';

interface IntegrationsAIWidgetProps {
  screen: IntegrationsScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<IntegrationsScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  main: {
    title: 'Assistente de Integrações',
    prompts: [
      'Integrações ativas no sistema',
      'Status de saúde das integrações',
      'Erros de integração nas últimas 24h',
      'Configurar nova integração',
      'Métricas de uso por integração',
    ],
    expanded: true,
  },
  provider: {
    title: 'Assistente de Integrações - Provider',
    prompts: [
      'Status desta integração',
      'Últimas requisições',
      'Erros recentes',
      'Configurações do provider',
      'Testar integração',
    ],
    expanded: true,
  },
  webhooks: {
    title: 'Assistente de Integrações - Webhooks',
    prompts: [
      'Webhooks ativos no sistema',
      'Webhooks com falhas nas últimas 24h',
      'Taxa de sucesso dos webhooks',
      'Últimas entregas de webhooks',
      'Configurar novo webhook',
    ],
    expanded: true,
  },
  'api-keys': {
    title: 'Assistente de Integrações - API Keys',
    prompts: [
      'API keys ativas no sistema',
      'API keys expirando nos próximos 30 dias',
      'Uso por API key este mês',
      'API keys bloqueadas ou suspensas',
      'Gerar nova API key',
    ],
    expanded: true,
  },
  logs: {
    title: 'Assistente de Integrações - Logs',
    prompts: [
      'Erros de integração nas últimas 24h',
      'Integrações com maior volume de requests',
      'Requests com status 4xx ou 5xx',
      'Tempo médio de resposta por integração',
      'Análise de logs por endpoint',
    ],
    expanded: true,
  },
  monitoring: {
    title: 'Assistente de Integrações - Monitoramento',
    prompts: [
      'Status de saúde das integrações',
      'Uptime das últimas 24h',
      'Integrações offline ou com problemas',
      'Rate limits próximos do limite',
      'Métricas de performance',
    ],
    expanded: false,
  },
};

export function IntegrationsAIWidget({
  screen,
  position = 'bottom-right',
  defaultMinimized,
}: IntegrationsAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="integrations"
      context={{
        module: 'integrations',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
