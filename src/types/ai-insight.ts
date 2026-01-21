/**
 * Types para o AIInsightWidget
 * Componente de insights contextuais dos agentes IA
 */

export type AgentType = 
  | 'fiscal' 
  | 'financial' 
  | 'tms' 
  | 'crm' 
  | 'accounting' 
  | 'fleet' 
  | 'strategic' 
  | 'qa'
  | 'auto'; // Auto-detecta baseado no contexto

export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export type InsightCategory = 
  | 'alert'      // Alertas importantes
  | 'suggestion' // Sugestões de ação
  | 'analysis'   // Análises de dados
  | 'question'   // Resposta a pergunta
  | 'status';    // Status de processo

export interface AIInsight {
  id: string;
  agentType: AgentType;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  content: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  actions?: InsightAction[];
  isStreaming?: boolean;
}

export interface InsightAction {
  id: string;
  label: string;
  type: 'link' | 'action' | 'copy';
  href?: string;
  onClick?: () => void;
}

export interface AIInsightWidgetProps {
  /** Tipo do agente a ser usado (ou 'auto' para detectar) */
  agentType?: AgentType;
  
  /** Contexto da tela atual para o agente */
  context?: {
    module: string;
    screen: string;
    entityId?: string;
    entityType?: string;
    data?: Record<string, unknown>;
  };
  
  /** Prompts iniciais sugeridos */
  suggestedPrompts?: string[];
  
  /** Título customizado do widget */
  title?: string;
  
  /** Se deve iniciar minimizado */
  defaultMinimized?: boolean;
  
  /** Posição do widget */
  position?: 'bottom-right' | 'bottom-left' | 'sidebar' | 'inline';
  
  /** Callback quando insight é gerado */
  onInsight?: (insight: AIInsight) => void;
  
  /** Classe CSS adicional */
  className?: string;
}

export interface UseAgentInsightsOptions {
  agentType: AgentType;
  context?: Record<string, unknown>;
  autoFetch?: boolean;
  fetchInterval?: number; // em ms, 0 = desabilitado
}

export interface UseAgentInsightsReturn {
  insights: AIInsight[];
  isLoading: boolean;
  error: Error | null;
  askQuestion: (question: string) => Promise<AIInsight>;
  clearInsights: () => void;
  refreshInsights: () => Promise<void>;
}
