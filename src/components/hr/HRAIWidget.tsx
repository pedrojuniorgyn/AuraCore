'use client';

import { AIInsightWidget } from '@/components/ai';

type HRScreen =
  | 'colaboradores'
  | 'jornadas'
  | 'ponto'
  | 'folha'
  | 'ferias';

interface HRAIWidgetProps {
  screen: HRScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<HRScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  colaboradores: {
    title: 'Assistente RH - Colaboradores',
    prompts: [
      'Quantos colaboradores ativos no sistema?',
      'Colaboradores admitidos nos últimos 30 dias',
      'Colaboradores com contrato vencendo',
      'Aniversariantes do mês',
      'Distribuição de colaboradores por cargo',
    ],
    expanded: true,
  },
  jornadas: {
    title: 'Assistente RH - Jornadas',
    prompts: [
      'Motoristas com jornada excedida hoje',
      'Tempo médio de jornada dos motoristas',
      'Alertas de descumprimento da Lei 13.103/2015',
      'Motoristas próximos do limite de 8h diárias',
      'Histórico de jornadas da última semana',
    ],
    expanded: true,
  },
  ponto: {
    title: 'Assistente RH - Ponto Eletrônico',
    prompts: [
      'Colaboradores sem registro de ponto hoje',
      'Inconsistências de ponto para revisar',
      'Horas extras acumuladas este mês',
      'Atrasos e faltas do período',
      'Banco de horas por colaborador',
    ],
    expanded: true,
  },
  folha: {
    title: 'Assistente RH - Folha de Pagamento',
    prompts: [
      'Valor total da folha este mês',
      'Proventos e descontos detalhados',
      'Pendências de fechamento da folha',
      'Adiantamentos solicitados',
      'Comparativo folha atual vs anterior',
    ],
    expanded: false,
  },
  ferias: {
    title: 'Assistente RH - Férias',
    prompts: [
      'Colaboradores com férias vencendo',
      'Férias programadas próximos 60 dias',
      'Colaboradores em gozo de férias agora',
      'Saldo de férias por colaborador',
      'Provisão financeira de férias',
    ],
    expanded: false,
  },
};

export function HRAIWidget({
  screen,
  position = 'bottom-right',
  defaultMinimized,
}: HRAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="hr"
      context={{
        module: 'hr',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
