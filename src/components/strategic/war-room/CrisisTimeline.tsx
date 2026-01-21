'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Loader2 } from 'lucide-react';
import type { WarRoomUpdate } from '@/lib/war-room/war-room-types';
import { UPDATE_TYPE_LABELS } from '@/lib/war-room/war-room-types';

interface Props {
  updates: WarRoomUpdate[];
  isLoading?: boolean;
  onAddUpdate?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function CrisisTimeline({
  updates,
  isLoading,
  onAddUpdate,
  hasMore,
  onLoadMore,
}: Props) {
  const groupedUpdates = updates.reduce(
    (groups, update) => {
      const date = format(new Date(update.timestamp), 'dd/MM', { locale: ptBR });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(update);
      return groups;
    },
    {} as Record<string, WarRoomUpdate[]>
  );

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Timeline de Eventos</h3>
        {onAddUpdate && (
          <button
            onClick={onAddUpdate}
            className="flex items-center gap-1 text-sm text-purple-400 
              hover:text-purple-300 transition-colors"
          >
            <Plus size={16} />
            Evento
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[72px] top-0 bottom-0 w-0.5 bg-white/10" />

        {Object.entries(groupedUpdates).map(([date, dateUpdates]) => (
          <div key={date} className="mb-4">
            {dateUpdates.map((update, index) => {
              const typeConfig = UPDATE_TYPE_LABELS[update.type];

              return (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 mb-3"
                >
                  <span className="text-white/40 text-sm w-14 text-right shrink-0">
                    {format(new Date(update.timestamp), 'HH:mm')}
                  </span>

                  <div
                    className="w-3 h-3 rounded-full bg-purple-500 mt-1.5 
                    shrink-0 relative z-10 ring-4 ring-gray-900"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-base">{typeConfig.icon}</span>
                      <div>
                        <p className="text-white/90 text-sm">{update.title}</p>
                        {update.description && (
                          <p className="text-white/50 text-xs mt-0.5">{update.description}</p>
                        )}
                        {update.userName && (
                          <p className="text-white/40 text-xs mt-1">por {update.userName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-purple-400 hover:text-purple-300 text-sm 
              transition-colors flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais'
            )}
          </button>
        </div>
      )}

      {updates.length === 0 && !isLoading && (
        <div className="text-center py-8 text-white/40">
          <p>Nenhum evento registrado</p>
        </div>
      )}
    </div>
  );
}
