import type { Meta, StoryObj } from '@storybook/react';
import { VirtualizedKpiList } from '@/components/strategic/VirtualizedKpiList';

/**
 * Lista virtualizada de KPIs para grandes volumes de dados.
 * 
 * Usa @tanstack/react-virtual para renderizar apenas os itens visíveis,
 * garantindo performance mesmo com milhares de KPIs.
 */
const meta: Meta<typeof VirtualizedKpiList> = {
  title: 'Strategic/VirtualizedKpiList',
  component: VirtualizedKpiList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper para gerar KPIs de teste
function generateKpis(count: number) {
  const perspectives = ['financial', 'customer', 'internal', 'learning'] as const;
  const statuses = ['critical', 'warning', 'on-track', 'achieved'] as const;
  const trends = ['up', 'down', 'stable'] as const;

  return Array.from({ length: count }, (_, i) => ({
    id: `kpi-${i + 1}`,
    name: `KPI ${i + 1} - Indicador de Performance`,
    code: `KPI-${String(i + 1).padStart(3, '0')}`,
    currentValue: Math.round(Math.random() * 100),
    targetValue: 80 + Math.round(Math.random() * 20),
    unit: i % 3 === 0 ? '%' : i % 3 === 1 ? 'R$' : 'un',
    perspective: perspectives[i % 4],
    status: statuses[i % 4],
    trend: trends[i % 3],
    lastUpdate: new Date().toISOString(),
  }));
}

/**
 * Lista com alguns KPIs.
 */
export const Default: Story = {
  args: {
    kpis: generateKpis(10),
    height: 400,
  },
};

/**
 * Lista vazia.
 */
export const Empty: Story = {
  args: {
    kpis: [],
    emptyMessage: 'Nenhum KPI encontrado. Crie seu primeiro KPI!',
    height: 400,
  },
};

/**
 * Estado de carregamento.
 */
export const Loading: Story = {
  args: {
    kpis: [],
    isLoading: true,
    height: 400,
  },
};

/**
 * Lista grande para testar virtualização.
 */
export const LargeList: Story = {
  args: {
    kpis: generateKpis(100),
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: '100 KPIs para demonstrar a virtualização - apenas ~8 são renderizados por vez.',
      },
    },
  },
};

/**
 * Lista muito grande (stress test).
 */
export const StressTest: Story = {
  args: {
    kpis: generateKpis(1000),
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story: '1000 KPIs para testar performance máxima da virtualização.',
      },
    },
  },
};

/**
 * Apenas KPIs críticos.
 */
export const CriticalOnly: Story = {
  args: {
    kpis: generateKpis(5).map(kpi => ({
      ...kpi,
      status: 'critical' as const,
      trend: 'down' as const,
      currentValue: 40 + Math.round(Math.random() * 20),
    })),
    height: 400,
  },
};

/**
 * Todos os KPIs atingiram a meta.
 */
export const AllAchieved: Story = {
  args: {
    kpis: generateKpis(8).map(kpi => ({
      ...kpi,
      status: 'achieved' as const,
      trend: 'up' as const,
      currentValue: 95 + Math.round(Math.random() * 5),
    })),
    height: 400,
  },
};
