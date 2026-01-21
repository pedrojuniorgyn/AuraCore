/**
 * TmsAIWidget - Wrapper do AIInsightWidget para o módulo TMS
 * Pré-configura prompts e contexto por tela
 */

'use client';

import { AIInsightWidget } from '@/components/ai';
import type { AIInsightWidgetProps } from '@/types/ai-insight';

type TmsScreen = 
  | 'cockpit'          // Dashboard executivo
  | 'viagens'          // Gestão de viagens
  | 'torre-controle'   // Torre de controle / Tracking
  | 'ocorrencias'      // Ocorrências
  | 'repositorio-cargas' // Repositório de cargas / Romaneios
  | 'cte-list'         // Lista de CTes
  | 'cte-detail';      // Detalhe do CTe

interface TmsAIWidgetProps {
  screen: TmsScreen;
  entityId?: string;
  position?: AIInsightWidgetProps['position'];
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<TmsScreen, {
  title: string;
  prompts: string[];
}> = {
  cockpit: {
    title: 'Assistente TMS',
    prompts: [
      'Qual o status das operações de hoje?',
      'Quantas viagens estão em andamento?',
      'Entregas atrasadas no momento',
      'Performance de entrega da semana',
      'Resumo de ocorrências abertas',
    ],
  },
  viagens: {
    title: 'Assistente de Viagens',
    prompts: [
      'Viagens em andamento',
      'Viagens atrasadas',
      'Próximas viagens a iniciar',
      'Motoristas disponíveis',
      'Veículos em manutenção',
    ],
  },
  'torre-controle': {
    title: 'Assistente Torre de Controle',
    prompts: [
      'Onde está o veículo X?',
      'Veículos parados há mais de 1h',
      'Previsão de chegada',
      'Desvios de rota detectados',
      'Status em tempo real da frota',
    ],
  },
  ocorrencias: {
    title: 'Assistente de Ocorrências',
    prompts: [
      'Ocorrências abertas',
      'Tipos mais frequentes de ocorrência',
      'Ocorrências por motorista',
      'Tempo médio de resolução',
      'Ocorrências críticas pendentes',
    ],
  },
  'repositorio-cargas': {
    title: 'Assistente de Cargas',
    prompts: [
      'Romaneios abertos',
      'Peso total do romaneio atual',
      'Capacidade disponível por veículo',
      'Otimizar carregamento',
      'CTes sem romaneio',
    ],
  },
  'cte-list': {
    title: 'Assistente CTe',
    prompts: [
      'CTes pendentes de emissão',
      'CTes com erro de validação',
      'Resumo de CTes do dia',
      'CTes sem manifesto',
      'Status das transmissões',
    ],
  },
  'cte-detail': {
    title: 'Análise do CTe',
    prompts: [
      'Validar dados deste CTe',
      'Verificar tributação',
      'Status de transmissão',
      'Histórico de alterações',
      'Documentos vinculados',
    ],
  },
};

export function TmsAIWidget({
  screen,
  entityId,
  position = 'bottom-right',
  defaultMinimized = false,
}: TmsAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="tms"
      context={{
        module: 'tms',
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
