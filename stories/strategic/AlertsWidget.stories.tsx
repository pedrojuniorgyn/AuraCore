import type { Meta, StoryObj } from '@storybook/react';
import { AlertsWidget } from '@/components/strategic/widgets/AlertsWidget';

/**
 * Widget que exibe alertas críticos relacionados à estratégia.
 * 
 * Os alertas são ordenados por severidade:
 * - 🔴 Critical: Requer ação imediata
 * - 🟡 Warning: Atenção necessária
 * - 🔵 Info: Informativo
 */
const meta: Meta<typeof AlertsWidget> = {
  title: 'Strategic/Widgets/AlertsWidget',
  component: AlertsWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    alerts: {
      description: 'Lista de alertas a exibir',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Widget com alertas de diferentes severidades.
 */
export const Default: Story = {
  args: {
    alerts: [
      {
        id: '1',
        type: 'kpi',
        message: 'OTD abaixo da meta por 3 dias consecutivos',
        severity: 'critical',
        kpiId: 'kpi-123',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'action-plan',
        message: 'Plano de ação "Melhorar expedição" atrasado',
        severity: 'warning',
        actionPlanId: 'plan-456',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'pdca',
        message: 'Ciclo PDCA aguardando verificação',
        severity: 'info',
        pdcaId: 'pdca-789',
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

/**
 * Todos os alertas são críticos.
 */
export const AllCritical: Story = {
  args: {
    alerts: [
      {
        id: '1',
        type: 'kpi',
        message: 'Margem de lucro abaixo do mínimo',
        severity: 'critical',
        kpiId: 'kpi-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'kpi',
        message: 'Satisfação do cliente em queda',
        severity: 'critical',
        kpiId: 'kpi-2',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'kpi',
        message: 'Produtividade abaixo da meta',
        severity: 'critical',
        kpiId: 'kpi-3',
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

/**
 * Nenhum alerta - tudo está bem!
 */
export const NoAlerts: Story = {
  args: {
    alerts: [],
  },
};

/**
 * Apenas um alerta.
 */
export const SingleAlert: Story = {
  args: {
    alerts: [
      {
        id: '1',
        type: 'kpi',
        message: 'Taxa de entrega precisa de atenção',
        severity: 'warning',
        kpiId: 'kpi-123',
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

/**
 * Muitos alertas para testar scroll.
 */
export const ManyAlerts: Story = {
  args: {
    alerts: Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      type: 'kpi' as const,
      message: `Alerta número ${i + 1} - Descrição do problema`,
      severity: i < 3 ? 'critical' : i < 6 ? 'warning' : 'info',
      kpiId: `kpi-${i + 1}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    })),
  },
};
