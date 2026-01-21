/**
 * FleetAIWidget - Wrapper do AIInsightWidget para o módulo Fleet
 * Pré-configura prompts e contexto por tela
 */

'use client';

import { AIInsightWidget } from '@/components/ai';
import type { AIInsightWidgetProps } from '@/types/ai-insight';

type FleetScreen = 
  | 'veiculos'           // Gestão de veículos
  | 'motoristas'         // Gestão de motoristas
  | 'manutencao-ordens'  // Ordens de manutenção
  | 'manutencao-planos'  // Planos de manutenção
  | 'pneus'              // Gestão de pneus
  | 'documentacao';      // Documentação e vencimentos

interface FleetAIWidgetProps {
  screen: FleetScreen;
  entityId?: string;
  position?: AIInsightWidgetProps['position'];
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<FleetScreen, {
  title: string;
  prompts: string[];
}> = {
  veiculos: {
    title: 'Assistente de Veículos',
    prompts: [
      'Veículos disponíveis para operação?',
      'Idade média da frota?',
      'Veículos com mais ocorrências?',
      'Próximas revisões programadas?',
      'Veículos por tipo e categoria?',
    ],
  },
  motoristas: {
    title: 'Assistente de Motoristas',
    prompts: [
      'Motoristas disponíveis?',
      'CNH vencendo em 30 dias?',
      'Motoristas com mais infrações?',
      'Produtividade por motorista?',
      'Treinamentos pendentes?',
    ],
  },
  'manutencao-ordens': {
    title: 'Assistente de Manutenção',
    prompts: [
      'Manutenções pendentes?',
      'Veículos com manutenção atrasada?',
      'Custo de manutenção por veículo?',
      'Tempo médio de reparo?',
      'Peças mais trocadas?',
    ],
  },
  'manutencao-planos': {
    title: 'Assistente de Planos',
    prompts: [
      'Planos de manutenção ativos?',
      'Próximas manutenções preventivas?',
      'Veículos fora do plano?',
      'Efetividade dos planos?',
      'Sugestão de novos planos?',
    ],
  },
  pneus: {
    title: 'Assistente de Pneus',
    prompts: [
      'Pneus próximos da troca?',
      'Vida útil média dos pneus?',
      'Custo por km de pneu?',
      'Estoque de pneus disponível?',
      'Recapagens programadas?',
    ],
  },
  documentacao: {
    title: 'Assistente de Documentos',
    prompts: [
      'Documentos vencendo esta semana?',
      'CRLV pendentes de renovação?',
      'Seguros a vencer?',
      'Tacógrafos para aferir?',
      'Licenças ambientais vencidas?',
    ],
  },
};

export function FleetAIWidget({
  screen,
  entityId,
  position = 'bottom-right',
  defaultMinimized = false,
}: FleetAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="fleet"
      context={{
        module: 'fleet',
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
