import type { Meta, StoryObj } from '@storybook/react';
import { DashboardWidget } from '@/components/strategic/DashboardWidget';

/**
 * Container de widget do dashboard.
 * 
 * Wrapper que fornece:
 * - Header com título e ícone
 * - Handle para drag (modo edição)
 * - Botão de remover (modo edição)
 * - Estilo consistente com glass effect
 */
const meta: Meta<typeof DashboardWidget> = {
  title: 'Strategic/DashboardWidget',
  component: DashboardWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] h-[200px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Widget em modo visualização.
 */
export const Default: Story = {
  args: {
    id: 'widget-1',
    title: 'Health Score',
    icon: '❤️',
    isEditing: false,
    children: (
      <div className="flex items-center justify-center h-full text-4xl font-bold text-purple-400">
        72%
      </div>
    ),
  },
};

/**
 * Widget em modo edição.
 */
export const EditMode: Story = {
  args: {
    id: 'widget-2',
    title: 'Alertas',
    icon: '🚨',
    isEditing: true,
    children: (
      <div className="flex items-center justify-center h-full text-white/60">
        Conteúdo do widget
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Em modo edição, o widget exibe o handle de drag e o botão de remover.',
      },
    },
  },
};

/**
 * Widget com conteúdo de loading.
 */
export const Loading: Story = {
  args: {
    id: 'widget-3',
    title: 'KPIs',
    icon: '🎯',
    isEditing: false,
    children: (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
};

/**
 * Widget com lista de itens.
 */
export const WithList: Story = {
  args: {
    id: 'widget-4',
    title: 'Top Ações',
    icon: '✅',
    isEditing: false,
    children: (
      <div className="space-y-2 p-2">
        {['Revisar processo', 'Treinar equipe', 'Atualizar sistema'].map((item, i) => (
          <div key={i} className="p-2 bg-white/5 rounded-lg text-sm text-white/80">
            {item}
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Widget com diferentes ícones.
 */
export const DifferentIcons: Story = {
  render: () => (
    <div className="flex gap-4">
      {[
        { icon: '❤️', title: 'Health' },
        { icon: '🚨', title: 'Alertas' },
        { icon: '📊', title: 'Gráfico' },
        { icon: '🤖', title: 'Aurora' },
      ].map((item, i) => (
        <div key={i} className="w-[150px] h-[100px]">
          <DashboardWidget
            id={`icon-${i}`}
            title={item.title}
            icon={item.icon}
            isEditing={false}
          >
            <div className="flex items-center justify-center h-full text-2xl">
              {item.icon}
            </div>
          </DashboardWidget>
        </div>
      ))}
    </div>
  ),
};
