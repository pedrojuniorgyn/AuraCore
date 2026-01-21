/**
 * AccountingAIWidget - Wrapper do AIInsightWidget para funcionalidades contábeis
 * Pré-configura prompts e contexto por tela (Plano de Contas, Centros de Custo, etc)
 */

'use client';

import { AIInsightWidget } from '@/components/ai';
import type { AIInsightWidgetProps } from '@/types/ai-insight';

type AccountingScreen = 
  | 'chart-of-accounts'  // Plano de Contas
  | 'cost-centers'       // Centros de Custo
  | 'categories'         // Categorias Financeiras
  | 'intercompany';      // Operações Intercompany

interface AccountingAIWidgetProps {
  screen: AccountingScreen;
  entityId?: string;
  position?: AIInsightWidgetProps['position'];
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<AccountingScreen, {
  title: string;
  prompts: string[];
}> = {
  'chart-of-accounts': {
    title: 'Assistente Plano de Contas',
    prompts: [
      'Contas sem movimentação no ano?',
      'Estrutura do plano de contas?',
      'Contas por natureza (ativo, passivo)?',
      'Sugestão de conta para lançamento?',
      'Contas analíticas vs sintéticas?',
    ],
  },
  'cost-centers': {
    title: 'Assistente Centros de Custo',
    prompts: [
      'Centros de custo mais utilizados?',
      'Despesas por centro de custo?',
      'Centros de custo sem rateio?',
      'Sugestão de centro para operação?',
      'Comparativo mensal por centro?',
    ],
  },
  categories: {
    title: 'Assistente de Categorias',
    prompts: [
      'Categorias mais utilizadas?',
      'Receitas vs Despesas por categoria?',
      'Sugestão de categoria para lançamento?',
      'Categorias sem movimentação?',
      'Hierarquia de categorias?',
    ],
  },
  intercompany: {
    title: 'Assistente Intercompany',
    prompts: [
      'Operações intercompany pendentes?',
      'Diferenças de conciliação?',
      'Lançamentos espelhados faltando?',
      'Saldo intercompany por filial?',
      'Sugestão de contabilização?',
    ],
  },
};

export function AccountingAIWidget({
  screen,
  entityId,
  position = 'bottom-right',
  defaultMinimized = false,
}: AccountingAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="accounting"
      context={{
        module: 'accounting',
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
