"use client";

/**
 * PriorityActionsCard - Card de ações prioritárias para War Room
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Target, Clock, ChevronRight, AlertCircle } from 'lucide-react';

export interface PriorityAction {
  id: string;
  code: string;
  title: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';
  daysRemaining: number;
}

interface Props {
  actions: PriorityAction[];
  onViewAll?: () => void;
  onActionClick?: (id: string) => void;
  maxItems?: number;
}

const STATUS_CONFIG = {
  ON_TRACK: { icon: '🟢', textColor: 'text-green-400' },
  AT_RISK: { icon: '🟡', textColor: 'text-yellow-400' },
  OVERDUE: { icon: '🔴', textColor: 'text-red-400' },
} as const;

export function PriorityActionsCard({ 
  actions, 
  onViewAll, 
  onActionClick,
  maxItems = 5 
}: Props) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm h-full flex flex-col">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-purple-400" />
        Top {maxItems} Ações Prioritárias
      </h3>

      <div className="flex-1 space-y-2">
        {actions.slice(0, maxItems).map((action, i) => {
          const config = STATUS_CONFIG[action.status];
          const isOverdue = action.daysRemaining < 0;
          
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 4 }}
              onClick={() => onActionClick?.(action.id)}
              className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 
                flex items-center gap-3 text-left transition-all group"
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{action.title}</p>
                <p className="text-white/40 text-xs">{action.code}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs ${config.textColor}`}>
                {isOverdue ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {Math.abs(action.daysRemaining)}d atrasado
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    {action.daysRemaining}d
                  </>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}

        {actions.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">Nenhuma ação prioritária</p>
          </div>
        )}
      </div>

      {onViewAll && actions.length > 0 && (
        <button
          onClick={onViewAll}
          className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10
            text-white/70 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
        >
          Ver todos <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
