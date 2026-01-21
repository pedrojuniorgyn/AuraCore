'use client';

import { AIInsightWidget } from '@/components/ai';

type FiscalScreen =
  | 'documentos'
  | 'cte'
  | 'sped'
  | 'creditos-tributarios'
  | 'entrada-notas'
  | 'ciap'
  | 'matriz-tributaria'
  | 'ncm-categorias';

interface FiscalAIWidgetProps {
  screen: FiscalScreen;
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  defaultMinimized?: boolean;
}

const SCREEN_CONFIG: Record<FiscalScreen, {
  title: string;
  prompts: string[];
  expanded: boolean;
}> = {
  documentos: {
    title: 'Assistente Fiscal - Documentos',
    prompts: [
      'Documentos com erro de autorização SEFAZ?',
      'NFes canceladas nos últimos 7 dias',
      'CTes pendentes de MDFe',
      'Documentos rejeitados por validação',
      'Total de documentos por tipo hoje',
    ],
    expanded: true,
  },
  cte: {
    title: 'Assistente Fiscal - CTe',
    prompts: [
      'CTes aguardando autorização',
      'CTes com erro de validação',
      'Média de tempo para autorização',
      'CTes que precisam de carta correção',
      'Valor total de frete este mês',
    ],
    expanded: true,
  },
  sped: {
    title: 'Assistente Fiscal - SPED',
    prompts: [
      'Status da geração do SPED Fiscal',
      'Erros de validação no arquivo SPED',
      'Prazo de entrega do próximo SPED',
      'Registros faltantes no SPED',
      'Comparar SPED atual vs anterior',
    ],
    expanded: true,
  },
  'creditos-tributarios': {
    title: 'Assistente Fiscal - Créditos',
    prompts: [
      'Saldo de créditos de ICMS disponíveis',
      'Créditos de PIS/COFINS acumulados',
      'Créditos próximos do vencimento',
      'Histórico de aproveitamento de créditos',
      'Créditos pendentes de homologação',
    ],
    expanded: true,
  },
  'entrada-notas': {
    title: 'Assistente Fiscal - Entrada de Notas',
    prompts: [
      'NFes de entrada não escrituradas',
      'Notas com divergência de valor',
      'Documentos aguardando conferência',
      'Notas com CFOP incorreto',
      'Total de entradas do mês',
    ],
    expanded: true,
  },
  ciap: {
    title: 'Assistente Fiscal - CIAP',
    prompts: [
      'Ativos no CIAP este mês',
      'Crédito de ICMS sobre ativo imobilizado',
      'Ativos com apropriação pendente',
      'Valor total de créditos CIAP',
      'Conferir cálculo de apropriação',
    ],
    expanded: false,
  },
  'matriz-tributaria': {
    title: 'Assistente Fiscal - Matriz Tributária',
    prompts: [
      'Regras tributárias por NCM',
      'CFOP mais utilizados',
      'Alíquotas de ICMS por UF',
      'Exceções tributárias cadastradas',
      'Validar regra tributária específica',
    ],
    expanded: false,
  },
  'ncm-categorias': {
    title: 'Assistente Fiscal - NCM',
    prompts: [
      'NCMs cadastrados no sistema',
      'Produtos sem NCM definido',
      'Categorias tributárias por NCM',
      'Alíquotas de IPI por NCM',
      'Buscar NCM por descrição',
    ],
    expanded: false,
  },
};

export function FiscalAIWidget({
  screen,
  position = 'bottom-right',
  defaultMinimized,
}: FiscalAIWidgetProps) {
  const config = SCREEN_CONFIG[screen];

  return (
    <AIInsightWidget
      agentType="fiscal"
      context={{
        module: 'fiscal',
        screen,
      }}
      suggestedPrompts={config.prompts}
      title={config.title}
      position={position}
      defaultMinimized={defaultMinimized ?? !config.expanded}
    />
  );
}
