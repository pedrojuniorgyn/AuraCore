'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { OKR } from '@/lib/okrs/okr-types';

interface Props {
  okr: OKR;
  showTrend?: boolean;
}

export function OKRProgress({ okr, showTrend = true }: Props) {
  const completedKRs = okr.keyResults.filter((kr) => kr.progress >= 100).length;
  const totalKRs = okr.keyResults.length;

  const getProgressColor = (progress: number): string => {
    if (progress >= 70) return 'from-green-500 to-emerald-400';
    if (progress >= 40) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-pink-400';
  };

  const getTrendIcon = (progress: number) => {
    if (progress >= 70) return <TrendingUp className="text-green-400" size={16} />;
    if (progress >= 40) return <Minus className="text-yellow-400" size={16} />;
    return <TrendingDown className="text-red-400" size={16} />;
  };

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-sm">Progresso do OKR</span>
        <div className="flex items-center gap-2">
          {showTrend && getTrendIcon(okr.progress)}
          <span className="text-white font-bold text-xl">{okr.progress}%</span>
        </div>
      </div>

      <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${okr.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(okr.progress)}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-2 bg-white/5 rounded-lg">
          <span className="text-white/40 text-xs block">Total KRs</span>
          <span className="text-white font-medium">{totalKRs}</span>
        </div>
        <div className="p-2 bg-green-500/10 rounded-lg">
          <span className="text-green-400/60 text-xs block">Concluídos</span>
          <span className="text-green-400 font-medium">{completedKRs}</span>
        </div>
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <span className="text-blue-400/60 text-xs block">Em Progresso</span>
          <span className="text-blue-400 font-medium">{totalKRs - completedKRs}</span>
        </div>
      </div>

      {okr.keyResults.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <span className="text-white/40 text-xs block mb-2">Distribuição por KR</span>
          <div className="space-y-2">
            {okr.keyResults.map((kr) => (
              <div key={kr.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-white/60 text-xs truncate mb-1">{kr.title}</div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${kr.progress}%` }}
                      className={`h-full rounded-full ${
                        kr.progress >= 100
                          ? 'bg-blue-500'
                          : kr.progress >= 70
                            ? 'bg-green-500'
                            : kr.progress >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
                <span className="text-white/40 text-xs w-10 text-right">{kr.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
