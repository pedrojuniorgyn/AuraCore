"use client";

/**
 * EntityTimeline - Timeline de eventos de uma entidade
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  user: { name: string };
  createdAt: Date | string;
}

interface Props {
  entityTitle: string;
  events: TimelineEvent[];
  isLoading?: boolean;
}

const ACTION_CONFIG: Record<string, { icon: string; colorClass: string }> = {
  CREATE: { icon: '➕', colorClass: 'bg-green-500' },
  UPDATE: { icon: '✏️', colorClass: 'bg-blue-500' },
  DELETE: { icon: '🗑️', colorClass: 'bg-red-500' },
  COMMENT: { icon: '💬', colorClass: 'bg-purple-500' },
  STATUS_CHANGE: { icon: '🔄', colorClass: 'bg-orange-500' },
  TASK_COMPLETED: { icon: '✅', colorClass: 'bg-green-500' },
  AUTO: { icon: '🤖', colorClass: 'bg-gray-500' },
};

export function EntityTimeline({ entityTitle, events, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h3 className="text-white font-bold mb-2 flex items-center gap-2">
        <History size={18} className="text-purple-400" />
        Histórico
      </h3>
      <p className="text-white/60 text-sm mb-6 truncate">{entityTitle}</p>

      {events.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          Nenhum evento registrado
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, i) => {
              const config = ACTION_CONFIG[event.action] || ACTION_CONFIG.UPDATE;
              const formattedDate = format(
                new Date(event.createdAt), 
                "dd/MM HH:mm", 
                { locale: ptBR }
              );

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-10"
                >
                  {/* Dot */}
                  <div className={`absolute left-2 top-1 w-4 h-4 rounded-full 
                    ${config.colorClass} border-4 border-gray-900 z-10`} />

                  {/* Content */}
                  <div>
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span>{config.icon} {event.action}</span>
                    </div>
                    <p className="text-white text-sm">{event.description}</p>
                    <p className="text-white/50 text-xs mt-1">{event.user.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
