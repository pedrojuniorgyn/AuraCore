'use client';

import { AIInsightWidget } from '@/components/ai';

type OperationalScreen =
  | 'sinistros'
  | 'margem-cte'
  | 'repositorio-cargas'
  | 'custos';

interface OperationalAIWidgetProps {
  screen: OperationalScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<OperationalScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  sinistros: {
    title: 'Assistente Operacional - Sinistros',
    prompts: [
      'Sinistros abertos nos últimos 30 dias',
      'Valor total de sinistros este mês',
      'Sinistros por tipo (roubo, avaria, extravio)',
      'Taxa de sinistralidade atual',
      'Sinistros pendentes de resolução',
    ],
    expanded: true,
  },
  'margem-cte': {
    title: 'Assistente Operacional - Margem CTe',
    prompts: [
      'Margem média por CTe este mês',
      'CTes com margem negativa',
      'Top 10 CTes mais rentáveis',
      'Análise de margem por cliente',
      'Comparativo de margem mês atual vs anterior',
    ],
    expanded: true,
  },
  'repositorio-cargas': {
    title: 'Assistente Operacional - Cargas',
    prompts: [
      'Cargas em trânsito no momento',
      'Cargas atrasadas para entrega',
      'Volume total transportado este mês',
      'Peso médio por carga',
      'Cargas por tipo de mercadoria',
    ],
    expanded: true,
  },
  custos: {
    title: 'Assistente Operacional - Custos',
    prompts: [
      'Resumo de custos operacionais do mês',
      'Principais centros de custo',
      'Variação de custos vs orçado',
      'Custo médio por quilômetro rodado',
      'Projeção de custos próximo trimestre',
    ],
    expanded: false,
  },
};

export function OperationalAIWidget({
  screen,
  position = 'bottom-right',
  defaultMinimized,
}: OperationalAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="operational"
      context={{
        module: 'operational',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
