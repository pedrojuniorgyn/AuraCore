'use client';

import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Edit2, Target } from 'lucide-react';
import type { KeyResultValueEntry } from '@/lib/okrs/okr-types';

interface Props {
  history: KeyResultValueEntry[];
  krTitle?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

export function OKRTimeline({ history, krTitle }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
        <Calendar className="mx-auto mb-3 text-white/30" size={32} />
        <p className="text-white/40">Nenhuma atualização registrada</p>
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      {krTitle && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
          <Target size={16} className="text-purple-400" />
          <h4 className="text-white font-medium">{krTitle}</h4>
        </div>
      )}

      <div className="space-y-4">
        {sortedHistory.map((entry, index) => {
          const prevEntry = sortedHistory[index + 1];
          const change = prevEntry ? entry.value - prevEntry.value : 0;
          const isPositive = change > 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-6"
            >
              {/* Timeline line */}
              {index < sortedHistory.length - 1 && (
                <div className="absolute left-[9px] top-6 bottom-0 w-px bg-white/10" />
              )}

              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center
                  ${
                    entry.progress >= 100
                      ? 'bg-blue-500/20'
                      : entry.progress >= 70
                        ? 'bg-green-500/20'
                        : entry.progress >= 40
                          ? 'bg-yellow-500/20'
                          : 'bg-red-500/20'
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full
                    ${
                      entry.progress >= 100
                        ? 'bg-blue-500'
                        : entry.progress >= 70
                          ? 'bg-green-500'
                          : entry.progress >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                />
              </div>

              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-xs">
                    {formatRelativeDate(entry.timestamp)}
                  </span>
                  <span className="text-white/40 text-xs">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      size={14}
                      className={isPositive ? 'text-green-400' : 'text-red-400'}
                    />
                    <span className="text-white font-medium">{entry.value}</span>
                    {change !== 0 && (
                      <span
                        className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {isPositive ? '+' : ''}
                        {change.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.progress}%` }}
                      className={`h-full rounded-full ${
                        entry.progress >= 100
                          ? 'bg-blue-500'
                          : entry.progress >= 70
                            ? 'bg-green-500'
                            : entry.progress >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <span className="text-white/60 text-sm">{entry.progress}%</span>
                </div>

                {entry.comment && (
                  <p className="text-white/50 text-sm mt-2 italic">&ldquo;{entry.comment}&rdquo;</p>
                )}

                <div className="flex items-center gap-1 mt-2 text-xs text-white/30">
                  <Edit2 size={10} />
                  <span>{entry.updatedBy}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
