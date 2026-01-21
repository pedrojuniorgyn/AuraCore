'use client';

import { AIInsightWidget } from '@/components/ai';

type CommercialScreen = 
  | 'crm'
  | 'quotes'
  | 'proposals'
  | 'simulator'
  | 'price-tables';

interface CommercialAIWidgetProps {
  screen: CommercialScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<CommercialScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  crm: {
    title: 'Assistente de CRM',
    prompts: [
      'Clientes ativos vs inativos?',
      'Clientes sem movimentação há 30 dias?',
      'Top 10 clientes por faturamento?',
      'Clientes com contrato vencendo?',
      'Análise de churn?',
    ],
    expanded: true,
  },
  quotes: {
    title: 'Assistente de Cotações',
    prompts: [
      'Cotações pendentes de resposta?',
      'Cotações que vencem hoje?',
      'Taxa de aprovação de cotações?',
      'Rotas mais cotadas?',
      'Tempo médio de resposta?',
    ],
    expanded: true,
  },
  proposals: {
    title: 'Assistente de Propostas',
    prompts: [
      'Propostas em negociação?',
      'Propostas próximas do fechamento?',
      'Valor total do pipeline?',
      'Propostas perdidas este mês?',
      'Follow-up necessário?',
    ],
    expanded: true,
  },
  simulator: {
    title: 'Assistente de Simulação',
    prompts: [
      'Simular frete de SP para RJ?',
      'Qual o custo por tonelada?',
      'Comparar modalidades?',
      'Margem mínima sugerida?',
      'Prazo de entrega estimado?',
    ],
    expanded: true,
  },
  'price-tables': {
    title: 'Assistente de Tabelas',
    prompts: [
      'Tabelas vigentes?',
      'Tabelas vencendo em 30 dias?',
      'Comparativo de preços por região?',
      'Tabelas por tipo de carga?',
      'Última atualização de preços?',
    ],
    expanded: false,
  },
};

export function CommercialAIWidget({ 
  screen, 
  position = 'bottom-right',
  defaultMinimized,
}: CommercialAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];
  
  return (
    <AIInsightWidget
      agentType="crm"
      context={{
        module: 'commercial',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
