import type { Meta, StoryObj } from '@storybook/react';
import { HealthScoreWidget } from '@/components/strategic/widgets/HealthScoreWidget';

/**
 * Widget que exibe o Health Score da estratégia.
 * 
 * O score é calculado com base na performance geral dos KPIs
 * e planos de ação, com cores indicando o status:
 * 
 * - 🔴 0-40: Crítico (vermelho)
 * - 🟡 41-60: Atenção (amarelo)
 * - 🔵 61-80: No caminho (azul)
 * - 🟢 81-100: Excelente (verde)
 */
const meta: Meta<typeof HealthScoreWidget> = {
  title: 'Strategic/Widgets/HealthScoreWidget',
  component: HealthScoreWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Widget de Health Score com animação circular e comparação com período anterior.',
      },
    },
  },
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Score atual de saúde (0-100)',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '0' },
      },
    },
    previousScore: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Score anterior para comparação',
      table: {
        type: { summary: 'number' },
      },
    },
    lastUpdate: {
      control: 'text',
      description: 'Data/hora da última atualização (ISO string)',
      table: {
        type: { summary: 'string' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado padrão do widget com score moderado.
 */
export const Default: Story = {
  args: {
    score: 72,
    previousScore: 68,
    lastUpdate: new Date().toISOString(),
  },
};

/**
 * Estado crítico - requer atenção imediata.
 */
export const Critical: Story = {
  args: {
    score: 35,
    previousScore: 45,
    lastUpdate: new Date().toISOString(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Score abaixo de 40 indica situação crítica que requer ação imediata.',
      },
    },
  },
};

/**
 * Estado de atenção - precisa melhorar.
 */
export const Warning: Story = {
  args: {
    score: 55,
    previousScore: 60,
    lastUpdate: new Date().toISOString(),
  },
};

/**
 * Estado excelente - estratégia em ótima forma.
 */
export const Excellent: Story = {
  args: {
    score: 92,
    previousScore: 88,
    lastUpdate: new Date().toISOString(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Score acima de 80 indica que a estratégia está sendo bem executada.',
      },
    },
  },
};

/**
 * Mostrando tendência de queda significativa.
 */
export const Declining: Story = {
  args: {
    score: 58,
    previousScore: 75,
    lastUpdate: new Date().toISOString(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quando o score atual é significativamente menor que o anterior.',
      },
    },
  },
};

/**
 * Mostrando melhoria significativa.
 */
export const Improving: Story = {
  args: {
    score: 78,
    previousScore: 55,
    lastUpdate: new Date().toISOString(),
  },
};

/**
 * Score máximo possível.
 */
export const Perfect: Story = {
  args: {
    score: 100,
    previousScore: 95,
    lastUpdate: new Date().toISOString(),
  },
};

/**
 * Score mínimo - emergência total.
 */
export const Emergency: Story = {
  args: {
    score: 5,
    previousScore: 15,
    lastUpdate: new Date().toISOString(),
  },
};
