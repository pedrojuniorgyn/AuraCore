'use client';

import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface Props {
  insight?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const defaultInsights = [
  "O KPI OTD apresenta tendência de queda nas últimas 2 semanas. Recomendo revisar os planos de ação relacionados a logística.",
  "A perspectiva de Cliente melhorou 5% este mês. Continue monitorando o NPS para manter o progresso.",
  "3 planos de ação estão próximos do vencimento. Priorize as ações PDC-002 e PDC-005.",
  "O Health Score geral está em 72%. Para atingir a meta de 80%, foque na perspectiva de Processos Internos.",
];

export function AuroraInsightWidget({ insight, isLoading = false, onRefresh }: Props) {
  const [currentInsight] = useState(() => 
    insight || defaultInsights[Math.floor(Math.random() * defaultInsights.length)]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Aurora branding */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">Aurora AI</p>
          <p className="text-white/40 text-xs">Assistente Estratégica</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Insight bubble */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/40">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Analisando...</span>
          </div>
        ) : (
          <p className="text-white/80 text-sm leading-relaxed line-clamp-4">
            💡 {currentInsight}
          </p>
        )}
      </motion.div>

      {/* Chat link */}
      <Link
        href="/strategic/dashboard"
        className="mt-3 flex items-center justify-center gap-2 text-purple-400 text-sm hover:text-purple-300 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          // Trigger chat opening - could use a global state or event
          const chatButton = document.querySelector('[data-aurora-chat]') as HTMLButtonElement;
          if (chatButton) chatButton.click();
        }}
      >
        <MessageCircle size={14} />
        Conversar com Aurora
      </Link>
    </div>
  );
}
