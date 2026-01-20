import type { Meta, StoryObj } from '@storybook/react';
import { AuroraInsightWidget } from '@/components/strategic/widgets/AuroraInsightWidget';

/**
 * Widget de insights gerados pela Aurora AI.
 * 
 * Exibe análises e recomendações baseadas nos dados estratégicos,
 * com animação de digitação para efeito visual.
 */
const meta: Meta<typeof AuroraInsightWidget> = {
  title: 'Strategic/Widgets/AuroraInsightWidget',
  component: AuroraInsightWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    insight: {
      control: 'text',
      description: 'Texto do insight gerado pela IA',
    },
    isLoading: {
      control: 'boolean',
      description: 'Estado de carregamento',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Insight padrão sobre correlação de dados.
 */
export const Default: Story = {
  args: {
    insight: 'Identificamos correlação entre entregas atrasadas e aumento de custos operacionais. Recomendo revisar processo de expedição.',
  },
};

/**
 * Insight sobre tendência positiva.
 */
export const PositiveInsight: Story = {
  args: {
    insight: 'Excelente progresso! A taxa de satisfação do cliente aumentou 15% este mês. Continue investindo em treinamento da equipe de atendimento.',
  },
};

/**
 * Insight de alerta.
 */
export const AlertInsight: Story = {
  args: {
    insight: '⚠️ Atenção: 3 KPIs financeiros estão em zona crítica há mais de 5 dias. Sugiro reunião de emergência com o time financeiro.',
  },
};

/**
 * Insight com recomendações específicas.
 */
export const RecommendationInsight: Story = {
  args: {
    insight: `Baseado na análise dos últimos 30 dias, recomendo:
    
1. Focar no KPI "Taxa de Entrega" - maior impacto no Health Score
2. Revisar plano de ação "Otimização de Rota" - atrasado em 5 dias
3. Considerar adicionar KPI de "Tempo Médio de Atendimento"`,
  },
};

/**
 * Carregando insight.
 */
export const Loading: Story = {
  args: {
    insight: undefined,
    isLoading: true,
  },
};

/**
 * Sem insight disponível.
 */
export const NoInsight: Story = {
  args: {
    insight: undefined,
    isLoading: false,
  },
};

/**
 * Insight longo.
 */
export const LongInsight: Story = {
  args: {
    insight: `Análise completa do período:

A performance estratégica apresentou melhoria significativa nas últimas 4 semanas. O Health Score subiu de 58 para 72 pontos, representando crescimento de 24%.

Principais fatores de sucesso:
• Melhoria na Taxa de Entrega no Prazo (+8%)
• Redução de custos operacionais (-12%)
• Aumento da satisfação do cliente (+5 pontos NPS)

Áreas de atenção:
• Margem de lucro ainda abaixo da meta
• 2 planos de ação atrasados
• Ciclo PDCA "Redução de Devoluções" parado há 7 dias

Próximos passos recomendados: Priorizar finalização dos planos atrasados e avançar o ciclo PDCA.`,
  },
};
