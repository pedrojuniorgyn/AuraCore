/**
 * Hook para interagir com os agentes IA e obter insights contextuais
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  AIInsight, 
  UseAgentInsightsOptions, 
  UseAgentInsightsReturn,
  AgentType,
  InsightCategory
} from '@/types/ai-insight';

/**
 * Hook para interagir com os agentes IA e obter insights contextuais
 */
export function useAgentInsights(
  options: UseAgentInsightsOptions
): UseAgentInsightsReturn {
  const { agentType, context, autoFetch = false, fetchInterval = 0 } = options;
  
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Mapeia o tipo de agente para o endpoint correto
   */
  const getAgentEndpoint = useCallback((type: AgentType): string => {
    if (type === 'auto') {
      // Detecta baseado no contexto
      const moduleName = (context?.module as string | undefined)?.toLowerCase() || '';
      if (moduleName.includes('fiscal') || moduleName.includes('nfe') || moduleName.includes('cte')) {
        return 'fiscal';
      }
      if (moduleName.includes('financ') || moduleName.includes('billing')) {
        return 'financial';
      }
      if (moduleName.includes('tms') || moduleName.includes('transport')) {
        return 'tms';
      }
      if (moduleName.includes('crm') || moduleName.includes('lead')) {
        return 'crm';
      }
      if (moduleName.includes('account') || moduleName.includes('contab')) {
        return 'accounting';
      }
      if (moduleName.includes('fleet') || moduleName.includes('frota')) {
        return 'fleet';
      }
      if (moduleName.includes('strategic') || moduleName.includes('bsc') || moduleName.includes('kpi')) {
        return 'strategic';
      }
      return 'strategic'; // Default
    }
    return type;
  }, [context]);

  /**
   * Faz uma pergunta ao agente e retorna o insight
   */
  const askQuestion = useCallback(async (question: string): Promise<AIInsight> => {
    setIsLoading(true);
    setError(null);
    
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          agentHint: getAgentEndpoint(agentType),
          context: context,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Erro ao consultar agente: ${response.status}`);
      }

      const data = await response.json();
      
      const insight: AIInsight = {
        id: globalThis.crypto.randomUUID(),
        agentType: agentType === 'auto' ? getAgentEndpoint(agentType) as AgentType : agentType,
        category: detectCategory(question, data.message?.content || data.content || ''),
        priority: 'medium',
        title: truncateTitle(question),
        content: data.message?.content || data.content || 'Sem resposta',
        timestamp: new Date(),
        context: context,
      };

      setInsights(prev => [insight, ...prev]);
      return insight;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err; // Re-throw para não mostrar como erro
      }
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [agentType, context, getAgentEndpoint]);

  /**
   * Limpa todos os insights
   */
  const clearInsights = useCallback(() => {
    setInsights([]);
    setError(null);
  }, []);

  /**
   * Atualiza insights (para uso com autoFetch)
   */
  const refreshInsights = useCallback(async () => {
    if (!autoFetch || !context) return;
    
    try {
      const screenName = (context.screen as string | undefined) || 'esta tela';
      await askQuestion(`Analise o contexto atual e forneça insights relevantes para ${screenName}`);
    } catch {
      // Erro já tratado no askQuestion
    }
  }, [autoFetch, context, askQuestion]);

  // Auto-fetch inicial e por intervalo
  useEffect(() => {
    if (autoFetch && context) {
      refreshInsights();
    }

    if (fetchInterval > 0) {
      const interval = setInterval(refreshInsights, fetchInterval);
      return () => clearInterval(interval);
    }
  }, [autoFetch, fetchInterval, refreshInsights, context]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    insights,
    isLoading,
    error,
    askQuestion,
    clearInsights,
    refreshInsights,
  };
}

/**
 * Detecta a categoria do insight baseado na pergunta e resposta
 */
function detectCategory(question: string, content: string): InsightCategory {
  const q = question.toLowerCase();
  const c = content.toLowerCase();
  
  if (q.includes('alerta') || q.includes('problema') || c.includes('atenção') || c.includes('urgente')) {
    return 'alert';
  }
  if (q.includes('sugest') || q.includes('recomend') || c.includes('sugiro') || c.includes('recomendo')) {
    return 'suggestion';
  }
  if (q.includes('analis') || q.includes('relatório') || c.includes('análise')) {
    return 'analysis';
  }
  if (q.includes('status') || q.includes('situação')) {
    return 'status';
  }
  return 'question';
}

/**
 * Trunca o título para exibição
 */
function truncateTitle(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
