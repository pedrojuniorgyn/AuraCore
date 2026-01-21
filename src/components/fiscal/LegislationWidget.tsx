// src/components/fiscal/LegislationWidget.tsx
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Loader2,
  Scale,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Type guard para extrair string de forma segura de unknown
 */
function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Extrai dados do documento de forma type-safe
 */
function extractDocumentContext(data: Record<string, unknown> | undefined): {
  ufEmitente: string | null;
  ufDestinatario: string | null;
  cfop: string | null;
  ncm: string | null;
} {
  if (!data) {
    return { ufEmitente: null, ufDestinatario: null, cfop: null, ncm: null };
  }
  
  return {
    ufEmitente: safeString(data.uf_emitente),
    ufDestinatario: safeString(data.uf_destinatario),
    cfop: safeString(data.cfop),
    ncm: safeString(data.ncm),
  };
}

interface RAGSource {
  id: string;
  title: string;
  content: string;
  source: string;
  article?: string;
  law?: string;
  score: number;
}

interface LegislationWidgetProps {
  /** Tipo de documento (nfe, cte, sped) */
  documentType: 'nfe' | 'cte' | 'sped' | 'general';
  /** ID do documento específico (opcional) */
  documentId?: string;
  /** Dados do documento para contexto (opcional) */
  documentData?: Record<string, unknown>;
  /** Título customizado */
  title?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Inicia expandido */
  defaultExpanded?: boolean;
}

/**
 * Prompts sugeridos por tipo de documento
 */
const SUGGESTED_PROMPTS: Record<string, string[]> = {
  nfe: [
    'Qual a alíquota de ICMS para operação interestadual?',
    'Quando devo destacar ICMS-ST na NFe?',
    'Quais são os códigos CST de ICMS?',
    'Como funciona o crédito de PIS/COFINS?',
    'Qual o prazo para cancelamento de NFe?',
  ],
  cte: [
    'Quais são as modalidades de CTe?',
    'Quando emitir CTe de subcontratação?',
    'Como funciona o ICMS no transporte interestadual?',
    'Qual a diferença entre CTe e MDF-e?',
    'Quando posso emitir carta de correção no CTe?',
  ],
  sped: [
    'Quais registros são obrigatórios no SPED Fiscal?',
    'Como funciona a EFD-Contribuições?',
    'Qual o prazo de entrega do SPED ECD?',
    'O que é o Bloco K do SPED Fiscal?',
    'Como retificar um SPED já entregue?',
  ],
  general: [
    'Quais são as alíquotas de PIS e COFINS?',
    'Como funciona a Reforma Tributária (IBS/CBS)?',
    'Quais são as retenções na fonte obrigatórias?',
    'O que muda com a Lei Kandir?',
    'Como calcular ICMS diferencial de alíquota?',
  ],
};

/**
 * Títulos por tipo de documento
 */
const TITLES: Record<string, string> = {
  nfe: 'Legislação NFe',
  cte: 'Legislação CTe',
  sped: 'Legislação SPED',
  general: 'Consulta Legislação',
};

/**
 * Ícones por tipo de documento
 */
const ICONS: Record<string, React.ReactNode> = {
  nfe: <FileText className="h-5 w-5" />,
  cte: <FileText className="h-5 w-5" />,
  sped: <BookOpen className="h-5 w-5" />,
  general: <Scale className="h-5 w-5" />,
};

export function LegislationWidget({
  documentType,
  documentId,
  documentData,
  title,
  className,
  defaultExpanded = false,
}: LegislationWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<RAGSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const widgetTitle = title || TITLES[documentType] || 'Legislação';
  const prompts = SUGGESTED_PROMPTS[documentType] || SUGGESTED_PROMPTS.general;

  /**
   * Buscar no RAG
   */
  const searchLegislation = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      // Enriquecer query com contexto do documento
      let enrichedQuery = searchQuery;
      if (documentType !== 'general') {
        enrichedQuery = `[Contexto: ${documentType.toUpperCase()}] ${searchQuery}`;
      }
      // Adicionar dados relevantes do documento ao contexto (type-safe)
      const docContext = extractDocumentContext(documentData);
      if (docContext.ufEmitente && docContext.ufDestinatario) {
        enrichedQuery += ` (UF Origem: ${docContext.ufEmitente}, UF Destino: ${docContext.ufDestinatario})`;
      }
      if (docContext.cfop) enrichedQuery += ` (CFOP: ${docContext.cfop})`;
      if (docContext.ncm) enrichedQuery += ` (NCM: ${docContext.ncm})`;

      const response = await fetch('/api/agents/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: enrichedQuery,
          collection: 'legislacao_fiscal',
          top_k: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao consultar legislação');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [documentType, documentData]);

  /**
   * Submeter consulta
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchLegislation(query);
  };

  /**
   * Clicar em sugestão
   */
  const handleSuggestion = (prompt: string) => {
    setQuery(prompt);
    searchLegislation(prompt);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader 
        className="py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ICONS[documentType]}
            <CardTitle className="text-base">{widgetTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="p-4">
              {/* Form de busca */}
              <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pergunte sobre a legislação..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={!query.trim() || isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Sugestões */}
              {!answer && !isLoading && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {prompts.slice(0, 3).map((prompt, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1.5"
                        onClick={() => handleSuggestion(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Resposta */}
              {answer && (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {/* Resposta do RAG */}
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm whitespace-pre-wrap">{answer}</p>
                    </div>

                    {/* Fontes */}
                    {sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Fontes ({sources.length})
                        </p>
                        <div className="space-y-2">
                          {sources.map((source, idx) => (
                            <div key={source.id || idx} className="p-3 rounded-lg bg-muted border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(source.score * 100)}%
                                </Badge>
                                <span className="text-sm font-medium">{source.title}</span>
                              </div>
                              <div className="text-xs space-y-1">
                                {source.law && (
                                  <p className="font-medium">📜 {source.law}</p>
                                )}
                                {source.article && (
                                  <p className="font-medium">📌 {source.article}</p>
                                )}
                                <p className="text-muted-foreground">{source.content}</p>
                                <p className="text-xs opacity-60">Fonte: {source.source}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Aviso legal */}
                    <p className="text-xs text-muted-foreground italic">
                      ⚠️ Esta é uma consulta automatizada. Sempre verifique a legislação vigente 
                      junto aos órgãos oficiais (SEFAZ, RFB) para decisões definitivas.
                    </p>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
