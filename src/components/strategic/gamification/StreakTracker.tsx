'use client';

import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy } from 'lucide-react';

interface Props {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
}

export function StreakTracker({ currentStreak, longestStreak, lastActiveDate }: Props) {
  const isActiveToday = new Date(lastActiveDate).toDateString() === new Date().toDateString();

  const getStreakColor = (streak: number): string => {
    if (streak >= 30) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-500 to-orange-500';
    if (streak >= 3) return 'from-yellow-400 to-yellow-500';
    return 'from-gray-400 to-gray-500';
  };

  const getStreakEmoji = (streak: number): string => {
    if (streak >= 100) return '💎';
    if (streak >= 30) return '🔥';
    if (streak >= 7) return '⚡';
    if (streak >= 3) return '✨';
    return '🌱';
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Flame className="text-orange-400" size={20} />
          Sequência
        </h3>
        {isActiveToday && (
          <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">
            Ativo hoje
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className={`w-24 h-24 rounded-full bg-gradient-to-br ${getStreakColor(currentStreak)} 
            flex items-center justify-center`}
        >
          <div className="text-center">
            <span className="text-3xl">{getStreakEmoji(currentStreak)}</span>
            <span className="text-2xl font-bold text-white block">{currentStreak}</span>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-white/60 text-sm mb-4">
        {currentStreak === 0
          ? 'Comece sua sequência hoje!'
          : currentStreak === 1
            ? '1 dia de sequência'
            : `${currentStreak} dias seguidos!`}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 rounded-xl text-center">
          <Trophy className="mx-auto mb-1 text-yellow-400" size={18} />
          <span className="text-white font-bold block">{longestStreak}</span>
          <span className="text-white/40 text-xs">Recorde</span>
        </div>
        <div className="p-3 bg-white/5 rounded-xl text-center">
          <Calendar className="mx-auto mb-1 text-blue-400" size={18} />
          <span className="text-white font-bold block">
            {new Date(lastActiveDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
          <span className="text-white/40 text-xs">Último acesso</span>
        </div>
      </div>

      {!isActiveToday && currentStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20"
        >
          <p className="text-yellow-400 text-sm text-center">
            ⚠️ Realize uma ação hoje para manter sua sequência!
          </p>
        </motion.div>
      )}
    </div>
  );
}
