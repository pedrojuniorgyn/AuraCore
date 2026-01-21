'use client';

import { AIInsightWidget } from '@/components/ai';

type AdminScreen =
  | 'usuarios'
  | 'filiais'
  | 'backoffice'
  | 'enterprise'
  | 'operacoes'
  | 'auditoria';

interface AdminAIWidgetProps {
  screen: AdminScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<AdminScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  usuarios: {
    title: 'Assistente Admin - Usuários',
    prompts: [
      'Quantos usuários ativos no sistema?',
      'Usuários sem acesso nos últimos 30 dias',
      'Usuários com permissões administrativas',
      'Últimos usuários criados esta semana',
      'Usuários bloqueados ou inativos',
    ],
    expanded: true,
  },
  filiais: {
    title: 'Assistente Admin - Filiais',
    prompts: [
      'Quantas filiais ativas no sistema?',
      'Filiais por organização',
      'Filiais sem certificado digital válido',
      'Filiais criadas recentemente',
      'Distribuição geográfica de filiais',
    ],
    expanded: true,
  },
  backoffice: {
    title: 'Assistente Admin - Backoffice',
    prompts: [
      'Resumo de atividades administrativas hoje',
      'Tarefas de backoffice pendentes',
      'Alertas de sistema críticos',
      'Jobs e rotinas programadas',
      'Status de integrações externas',
    ],
    expanded: true,
  },
  enterprise: {
    title: 'Assistente Admin - Enterprise',
    prompts: [
      'Configurações enterprise ativas',
      'Features habilitadas por organização',
      'Limites e quotas configuradas',
      'Planos e assinaturas',
      'Customizações por cliente',
    ],
    expanded: false,
  },
  operacoes: {
    title: 'Assistente Admin - Operações',
    prompts: [
      'Status das operações em execução',
      'Filas de processamento',
      'Jobs agendados pendentes',
      'Erros de integração recentes',
      'Performance do sistema',
    ],
    expanded: false,
  },
  auditoria: {
    title: 'Assistente Admin - Auditoria',
    prompts: [
      'Logs de acesso suspeitos',
      'Alterações críticas nas últimas 24h',
      'Usuários com mais ações hoje',
      'Falhas de autenticação recentes',
      'Histórico de mudanças em configurações',
    ],
    expanded: false,
  },
};

export function AdminAIWidget({
  screen,
  position = 'bottom-right',
  defaultMinimized,
}: AdminAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="admin"
      context={{
        module: 'admin',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
