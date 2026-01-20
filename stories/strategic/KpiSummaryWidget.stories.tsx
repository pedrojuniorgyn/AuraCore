import type { Meta, StoryObj } from '@storybook/react';
import { KpiSummaryWidget } from '@/components/strategic/widgets/KpiSummaryWidget';

/**
 * Widget que exibe resumo de KPIs por perspectiva do Balanced Scorecard.
 * 
 * As 4 perspectivas BSC:
 * - 💰 Financeiro: Resultados financeiros
 * - 👥 Cliente: Satisfação e retenção
 * - ⚙️ Processos: Eficiência operacional
 * - 📚 Aprendizado: Desenvolvimento e inovação
 */
const meta: Meta<typeof KpiSummaryWidget> = {
  title: 'Strategic/Widgets/KpiSummaryWidget',
  component: KpiSummaryWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Resumo balanceado com diferentes status por perspectiva.
 */
export const Default: Story = {
  args: {
    perspectives: [
      { 
        name: 'Financeiro', 
        icon: '💰',
        total: 10, 
        achieved: 7, 
        onTrack: 2, 
        critical: 1 
      },
      { 
        name: 'Cliente', 
        icon: '👥',
        total: 8, 
        achieved: 5, 
        onTrack: 2, 
        critical: 1 
      },
      { 
        name: 'Processos', 
        icon: '⚙️',
        total: 12, 
        achieved: 8, 
        onTrack: 3, 
        critical: 1 
      },
      { 
        name: 'Aprendizado', 
        icon: '📚',
        total: 6, 
        achieved: 4, 
        onTrack: 2, 
        critical: 0 
      },
    ],
  },
};

/**
 * Todas as perspectivas com performance excelente.
 */
export const AllExcellent: Story = {
  args: {
    perspectives: [
      { name: 'Financeiro', icon: '💰', total: 10, achieved: 10, onTrack: 0, critical: 0 },
      { name: 'Cliente', icon: '👥', total: 8, achieved: 8, onTrack: 0, critical: 0 },
      { name: 'Processos', icon: '⚙️', total: 12, achieved: 11, onTrack: 1, critical: 0 },
      { name: 'Aprendizado', icon: '📚', total: 6, achieved: 6, onTrack: 0, critical: 0 },
    ],
  },
};

/**
 * Muitos KPIs críticos.
 */
export const ManyCritical: Story = {
  args: {
    perspectives: [
      { name: 'Financeiro', icon: '💰', total: 10, achieved: 2, onTrack: 3, critical: 5 },
      { name: 'Cliente', icon: '👥', total: 8, achieved: 1, onTrack: 2, critical: 5 },
      { name: 'Processos', icon: '⚙️', total: 12, achieved: 4, onTrack: 4, critical: 4 },
      { name: 'Aprendizado', icon: '📚', total: 6, achieved: 1, onTrack: 2, critical: 3 },
    ],
  },
};

/**
 * Poucas métricas definidas (empresa iniciando).
 */
export const FewMetrics: Story = {
  args: {
    perspectives: [
      { name: 'Financeiro', icon: '💰', total: 2, achieved: 1, onTrack: 1, critical: 0 },
      { name: 'Cliente', icon: '👥', total: 2, achieved: 1, onTrack: 0, critical: 1 },
      { name: 'Processos', icon: '⚙️', total: 0, achieved: 0, onTrack: 0, critical: 0 },
      { name: 'Aprendizado', icon: '📚', total: 1, achieved: 0, onTrack: 1, critical: 0 },
    ],
  },
};

/**
 * Sem KPIs definidos.
 */
export const NoKpis: Story = {
  args: {
    perspectives: [
      { name: 'Financeiro', icon: '💰', total: 0, achieved: 0, onTrack: 0, critical: 0 },
      { name: 'Cliente', icon: '👥', total: 0, achieved: 0, onTrack: 0, critical: 0 },
      { name: 'Processos', icon: '⚙️', total: 0, achieved: 0, onTrack: 0, critical: 0 },
      { name: 'Aprendizado', icon: '📚', total: 0, achieved: 0, onTrack: 0, critical: 0 },
    ],
  },
};
