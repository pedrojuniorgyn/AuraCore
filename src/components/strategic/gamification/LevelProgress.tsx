'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { UserPoints } from '@/lib/gamification/gamification-types';

interface Props {
  points: UserPoints;
  showDetails?: boolean;
}

export function LevelProgress({ points, showDetails = true }: Props) {
  const progress =
    points.nextLevelXp > 0
      ? Math.round((points.currentLevelXp / points.nextLevelXp) * 100)
      : 100;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
          flex items-center justify-center"
        >
          <Star className="text-white" size={32} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">Nível</span>
            <span className="text-2xl font-bold text-white">{points.level}</span>
          </div>
          <p className="text-purple-400 font-medium">{points.levelName}</p>
        </div>
        <div className="text-right">
          <span className="text-white/40 text-sm block">Total XP</span>
          <span className="text-xl font-bold text-white">
            {points.totalXp.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/60">Progresso para Nível {points.level + 1}</span>
          <span className="text-white">
            {points.currentLevelXp.toLocaleString()} / {points.nextLevelXp.toLocaleString()} XP
          </span>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Stats */}
      {showDetails && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <span>🔥</span>
              <span className="font-bold">{points.currentStreak}</span>
            </div>
            <span className="text-white/40 text-xs">Sequência</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <span>🏆</span>
              <span className="font-bold">{points.unlockedAchievements}</span>
            </div>
            <span className="text-white/40 text-xs">Conquistas</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <span>📊</span>
              <span className="font-bold">{points.xpFromKpis}</span>
            </div>
            <span className="text-white/40 text-xs">XP KPIs</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <span>📋</span>
              <span className="font-bold">{points.xpFromActionPlans}</span>
            </div>
            <span className="text-white/40 text-xs">XP Planos</span>
          </div>
        </div>
      )}
    </div>
  );
}
