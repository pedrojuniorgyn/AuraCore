/**
 * AIInsightWidget - Componente de insights contextuais dos agentes IA
 * 
 * @example
 * // No Dashboard Strategic
 * <AIInsightWidget 
 *   agentType="strategic"
 *   context={{ module: 'strategic', screen: 'dashboard' }}
 *   suggestedPrompts={['Analise os KPIs', 'Status do BSC']}
 * />
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  X, 
  Minimize2, 
  Maximize2, 
  Send, 
  Sparkles,
  AlertCircle,
  Lightbulb,
  BarChart3,
  HelpCircle,
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentInsights } from '@/hooks/useAgentInsights';
import type { 
  AIInsightWidgetProps, 
  AIInsight, 
  InsightCategory,
  InsightPriority 
} from '@/types/ai-insight';

export function AIInsightWidget({
  agentType = 'auto',
  context,
  suggestedPrompts = [],
  title = 'Assistente IA',
  defaultMinimized = false,
  position = 'bottom-right',
  onInsight,
  className,
}: AIInsightWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    insights,
    isLoading,
    error,
    askQuestion,
    clearInsights,
  } = useAgentInsights({
    agentType,
    context,
    autoFetch: false,
  });

  // Auto-scroll quando novos insights chegam
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [insights]);

  // Callback quando insight é gerado
  useEffect(() => {
    if (insights.length > 0 && onInsight) {
      onInsight(insights[0]);
    }
  }, [insights, onInsight]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const question = inputValue;
    setInputValue('');
    setShowSuggestions(false);
    
    try {
      await askQuestion(question);
    } catch {
      // Erro tratado no hook
    }
  };

  const handleSuggestedPrompt = async (prompt: string): Promise<void> => {
    setShowSuggestions(false);
    try {
      await askQuestion(prompt);
    } catch {
      // Erro tratado no hook
    }
  };

  const positionClasses = {
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'sidebar': 'relative',
    'inline': 'relative w-full',
  };

  // Widget Minimizado
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(positionClasses[position], className)}
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        >
          <Bot className="h-6 w-6 text-white" />
          {insights.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {insights.length}
            </span>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(positionClasses[position], className)}
    >
      <Card className={cn(
        'shadow-2xl border-violet-200 dark:border-violet-800',
        isExpanded ? 'w-[500px] h-[600px]' : 'w-[380px] h-[480px]',
        position === 'inline' && 'w-full h-auto min-h-[400px]'
      )}>
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {agentType === 'auto' ? 'Assistente Contextual' : `Agente ${agentType}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setIsMinimized(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col h-[calc(100%-80px)] p-3">
          {/* Área de Insights */}
          <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
            <AnimatePresence mode="popLayout">
              {/* Erro */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error.message}</span>
                  </div>
                </motion.div>
              )}

              {/* Sugestões */}
              {showSuggestions && suggestedPrompts.length > 0 && insights.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-3"
                >
                  <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleSuggestedPrompt(prompt)}
                        disabled={isLoading}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Loading */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  <span className="text-sm text-violet-600 dark:text-violet-400">
                    Analisando...
                  </span>
                </motion.div>
              )}

              {/* Insights */}
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}

              {/* Estado vazio */}
              {!isLoading && insights.length === 0 && !showSuggestions && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Faça uma pergunta para começar</p>
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte algo..."
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Footer com ações */}
          {insights.length > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{insights.length} insight(s)</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={clearInsights}
              >
                Limpar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Card individual de insight
 */
function InsightCard({ insight }: { insight: AIInsight }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const categoryConfig: Record<InsightCategory, { icon: React.ReactNode; color: string }> = {
    alert: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500' },
    suggestion: { icon: <Lightbulb className="h-4 w-4" />, color: 'text-yellow-500' },
    analysis: { icon: <BarChart3 className="h-4 w-4" />, color: 'text-blue-500' },
    question: { icon: <HelpCircle className="h-4 w-4" />, color: 'text-violet-500' },
    status: { icon: <Activity className="h-4 w-4" />, color: 'text-green-500' },
  };

  const priorityConfig: Record<InsightPriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    critical: 'bg-red-100 text-red-600',
  };

  const config = categoryConfig[insight.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-3 p-3 rounded-lg bg-card border shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <span className="text-sm font-medium">{insight.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={cn('text-xs', priorityConfig[insight.priority])}>
            {insight.priority}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {insight.content}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(insight.timestamp).toLocaleTimeString('pt-BR')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
