'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_STREAK = {
  current: 15,
  longest: 32,
  lastActive: new Date(),
};

export function StreakWidget({ widget }: Props) {
  const config = widget.config as { showRecord?: boolean; showCalendar?: boolean };
  const streak = MOCK_STREAK;

  const getStreakColor = (days: number): string => {
    if (days >= 30) return 'from-orange-500 to-red-500';
    if (days >= 7) return 'from-yellow-500 to-orange-500';
    if (days >= 3) return 'from-yellow-400 to-yellow-500';
    return 'from-gray-400 to-gray-500';
  };

  const getStreakEmoji = (days: number): string => {
    if (days >= 100) return '💎';
    if (days >= 30) return '🔥';
    if (days >= 7) return '⚡';
    if (days >= 3) return '✨';
    return '🌱';
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className={`w-20 h-20 rounded-full bg-gradient-to-br ${getStreakColor(streak.current)} 
          flex items-center justify-center mb-3`}
      >
        <div className="text-center">
          <span className="text-2xl">{getStreakEmoji(streak.current)}</span>
        </div>
      </motion.div>

      <div className="text-center">
        <span className="text-3xl font-bold text-white">{streak.current}</span>
        <span className="text-white/60 text-sm block">dias seguidos</span>
      </div>

      {config.showRecord && (
        <div className="flex items-center gap-2 mt-3 text-white/50 text-sm">
          <Trophy size={14} className="text-yellow-400" />
          <span>Recorde: {streak.longest} dias</span>
        </div>
      )}
    </div>
  );
}
