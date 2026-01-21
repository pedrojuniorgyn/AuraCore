'use client';

import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_OKR = {
  id: '1',
  title: 'Aumentar satisfação do cliente',
  progress: 68,
  level: 'corporate',
  keyResults: [
    { id: 'kr1', title: 'NPS > 70', progress: 85, current: 68, target: 70 },
    { id: 'kr2', title: 'Reclamações < 5%', progress: 60, current: 7, target: 5 },
    { id: 'kr3', title: 'Tempo resposta < 24h', progress: 75, current: 20, target: 24 },
  ],
};

export function OKRWidget({ widget }: Props) {
  const config = widget.config as { showKeyResults?: boolean };
  const okr = MOCK_OKR;

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (widget.type === 'okr_tree') {
    return (
      <div className="h-full space-y-3 overflow-auto">
        {/* Main OKR */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-purple-400" />
            <span className="text-white font-medium text-sm">{okr.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${okr.progress}%` }}
                className={`h-full rounded-full ${getProgressColor(okr.progress)}`}
              />
            </div>
            <span className="text-white/70 text-sm">{okr.progress}%</span>
          </div>
        </div>

        {/* Key Results */}
        {config.showKeyResults &&
          okr.keyResults.map((kr, index) => (
            <motion.div
              key={kr.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="ml-4 p-2 rounded-lg bg-white/5 border-l-2 border-purple-500/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <ChevronRight size={14} className="text-white/40" />
                <span className="text-white/70 text-sm">{kr.title}</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getProgressColor(kr.progress)}`}
                    style={{ width: `${kr.progress}%` }}
                  />
                </div>
                <span className="text-white/50 text-xs">{kr.progress}%</span>
              </div>
            </motion.div>
          ))}
      </div>
    );
  }

  // Progress view
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-white">{okr.progress}%</span>
        <p className="text-white/50 text-sm mt-1">{okr.title}</p>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${okr.progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${getProgressColor(okr.progress)}`}
        />
      </div>
    </div>
  );
}
