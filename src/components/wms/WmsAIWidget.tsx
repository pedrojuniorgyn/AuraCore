/**
 * WmsAIWidget - Wrapper do AIInsightWidget para o módulo WMS
 * Pré-configura prompts e contexto por tela
 */

'use client';

import { AIInsightWidget } from '@/components/ai';
import type { AIInsightWidgetProps } from '@/types/ai-insight';

type WmsScreen = 
  | 'enderecos'      // Gestão de endereços
  | 'faturamento'    // Faturamento de eventos
  | 'inventario';    // Inventário e contagens

interface WmsAIWidgetProps {
  screen: WmsScreen;
  entityId?: string;
  position?: AIInsightWidgetProps['position'];
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<WmsScreen, {
  title: string;
  prompts: string[];
}> = {
  enderecos: {
    title: 'Assistente de Endereços',
    prompts: [
      'Endereços disponíveis por tipo?',
      'Posições bloqueadas?',
      'Capacidade total vs utilizada?',
      'Sugestão de novo endereçamento?',
      'Taxa de ocupação por zona?',
    ],
  },
  faturamento: {
    title: 'Assistente de Faturamento',
    prompts: [
      'Eventos pendentes de faturamento?',
      'Pré-faturas geradas hoje?',
      'Valor total a faturar este mês?',
      'Clientes com maior volume de eventos?',
      'Divergências de faturamento?',
    ],
  },
  inventario: {
    title: 'Assistente de Inventário',
    prompts: [
      'Divergências de inventário pendentes?',
      'Produtos com estoque zerado?',
      'Última contagem por zona?',
      'Acuracidade do inventário?',
      'Contagens em andamento?',
    ],
  },
};

export function WmsAIWidget({
  screen,
  entityId,
  position = 'bottom-right',
  defaultMinimized = false,
}: WmsAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="wms"
      context={{
        module: 'wms',
        screen,
        entityId,
        entityType: screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized}
    />
  );
}
