'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WarRoomAction } from '@/lib/war-room/war-room-types';
import { ACTION_STATUS_CONFIG, ACTION_PRIORITY_CONFIG } from '@/lib/war-room/war-room-types';

interface Props {
  actions: WarRoomAction[];
  onCreateAction: () => void;
  onCompleteAction: (id: string) => void;
  onViewAll: () => void;
}

export function ActionBoard({ actions, onCreateAction, onCompleteAction, onViewAll }: Props) {
  const pendingActions = actions.filter(
    (a) => a.status === 'pending' || a.status === 'in_progress'
  );

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">
          Ações em Andamento ({pendingActions.length})
        </h3>
        <button
          onClick={onCreateAction}
          className="flex items-center gap-1 text-sm text-purple-400 
            hover:text-purple-300 transition-colors"
        >
          <Plus size={16} />
          Nova Ação
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pendingActions.slice(0, 5).map((action, index) => {
          const statusConfig = ACTION_STATUS_CONFIG[action.status];
          const priorityConfig = ACTION_PRIORITY_CONFIG[action.priority];

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 rounded-xl bg-white/5 group"
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onCompleteAction(action.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center 
                    justify-center transition-colors shrink-0
                    ${action.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-purple-500'}`}
                >
                  {action.status === 'completed' && <Check size={12} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={statusConfig.color}>{statusConfig.icon}</span>
                    <span className="text-white/80 text-sm truncate">{action.title}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    <span>→ {action.assigneeName}</span>
                    {action.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(action.dueDate), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                    <span className={priorityConfig.color}>{priorityConfig.label}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {pendingActions.length > 5 && (
        <button
          onClick={onViewAll}
          className="w-full mt-3 py-2 text-sm text-purple-400 
            hover:text-purple-300 transition-colors"
        >
          Ver todas ({pendingActions.length})
        </button>
      )}

      {pendingActions.length === 0 && (
        <div className="text-center py-6 text-white/40">
          <Check size={24} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm">Todas as ações concluídas</p>
        </div>
      )}
    </div>
  );
}
