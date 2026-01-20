/**
 * OnboardingChecklist
 * Widget flutuante com checklist de primeiros passos
 * 
 * @module strategic/components
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Sparkles,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  link?: string;
}

const defaultChecklist: ChecklistItem[] = [
  {
    id: 'complete-tour',
    title: 'Completar tour inicial',
    description: 'Conheça as principais funcionalidades do sistema',
  },
  {
    id: 'create-kpi',
    title: 'Criar primeiro KPI',
    description: 'Defina um indicador para acompanhar',
    link: '/strategic/kpis/new',
  },
  {
    id: 'set-target',
    title: 'Definir uma meta',
    description: 'Estabeleça um objetivo mensurável',
    link: '/strategic/goals',
  },
  {
    id: 'create-action-plan',
    title: 'Criar plano de ação',
    description: 'Use 5W2H para estruturar uma iniciativa',
    link: '/strategic/action-plans/new',
  },
  {
    id: 'invite-member',
    title: 'Convidar membro da equipe',
    description: 'Colabore com seu time',
    link: '/settings/team',
  },
];

export function OnboardingChecklist() {
  const { 
    isChecklistVisible, 
    checklistProgress, 
    hideChecklist, 
    isHydrated,
    isTourActive,
    isFirstVisit,
    startTour,
  } = useOnboarding();
  
  const [isExpanded, setIsExpanded] = useState(true);

  // Mapear progresso para items
  const items = defaultChecklist.map(item => ({
    ...item,
    completed: checklistProgress[item.id] || false,
  }));

  const completedCount = items.filter(item => item.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  // FIX: Condição de visibilidade corrigida
  // Não mostrar se:
  // 1. Não hidratou ainda (SSR)
  // 2. Usuário fechou manualmente (isChecklistVisible = false)
  // 3. Todos os itens foram completados (progress = 100)
  // 4. Tour está ativo (não sobrepor)
  // 5. Welcome modal está visível (isFirstVisit = true)
  if (!isHydrated || !isChecklistVisible || progress === 100 || isTourActive || isFirstVisit) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-80"
    >
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
        shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-4 py-3 border-b border-white/10 flex items-center justify-between 
            cursor-pointer hover:bg-white/5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <span className="text-white font-medium">Primeiros Passos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">{progress}%</span>
            {isExpanded ? (
              <ChevronDown size={18} className="text-white/50" />
            ) : (
              <ChevronUp size={18} className="text-white/50" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); hideChecklist(); }}
              className="p-1 rounded-lg hover:bg-white/10 text-white/40"
              aria-label="Fechar checklist"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
        </div>

        {/* Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-2 space-y-2 max-h-64 overflow-y-auto">
                {items.map((item) => {
                  const isTourItem = item.id === 'complete-tour';
                  const isClickable = !item.completed && (item.link || isTourItem);
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-2 rounded-xl transition-all
                        ${item.completed 
                          ? 'bg-green-500/10' 
                          : isClickable
                            ? 'hover:bg-white/5 cursor-pointer' 
                            : ''
                        }`}
                      onClick={() => {
                        if (item.completed) return;
                        // Se é o item do tour, iniciar tour
                        if (isTourItem) {
                          startTour();
                          return;
                        }
                        // Se tem link, navegar
                        if (item.link) {
                          window.location.href = item.link;
                        }
                      }}
                    >
                      {item.completed ? (
                        <CheckCircle2 size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle size={20} className="text-white/30 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          item.completed ? 'text-green-400 line-through' : 'text-white'
                        }`}>
                          {item.title}
                        </p>
                        <p className="text-white/40 text-xs truncate">{item.description}</p>
                      </div>
                      {/* Ícone de ação */}
                      {!item.completed && isTourItem && (
                        <Play size={14} className="text-purple-400 mt-1 flex-shrink-0" />
                      )}
                      {!item.completed && item.link && (
                        <ExternalLink size={14} className="text-white/30 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
