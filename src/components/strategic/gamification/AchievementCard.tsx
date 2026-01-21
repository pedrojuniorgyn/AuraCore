'use client';

import { motion } from 'framer-motion';
import { Lock, Check, Gift } from 'lucide-react';
import type { UserAchievement } from '@/lib/gamification/gamification-types';
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/gamification/gamification-types';

interface Props {
  userAchievement: UserAchievement;
  onClaim?: () => void;
}

export function AchievementCard({ userAchievement, onClaim }: Props) {
  const { achievement, progress, isUnlocked, isClaimed } = userAchievement;
  const isProgressive = achievement.isProgressive && achievement.maxProgress;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-4 rounded-2xl border transition-all
        ${
          isUnlocked
            ? 'bg-white/5 border-white/20'
            : 'bg-white/[0.02] border-white/10 opacity-60'
        }`}
    >
      {/* Rarity indicator */}
      <div
        className={`absolute top-0 left-0 w-full h-1 rounded-t-2xl bg-gradient-to-r
          ${RARITY_COLORS[achievement.rarity]}`}
      />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl
            ${
              isUnlocked
                ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} p-0.5`
                : 'bg-white/10'
            }`}
        >
          {isUnlocked ? (
            <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
              {achievement.icon}
            </div>
          ) : (
            <Lock className="text-white/30" size={24} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold truncate">{achievement.name}</h3>
            {isUnlocked && isClaimed && <Check className="text-green-400" size={16} />}
          </div>

          <p className="text-white/50 text-sm mb-2 line-clamp-2">{achievement.description}</p>

          {/* Progress bar for progressive achievements */}
          {isProgressive && !isUnlocked && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/40">Progresso</span>
                <span className="text-white/60">
                  {progress}/{achievement.maxProgress}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(progress / (achievement.maxProgress || 1)) * 100}%`,
                  }}
                  className={`h-full rounded-full bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]}`}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r
                  ${RARITY_COLORS[achievement.rarity]} text-white`}
              >
                {RARITY_LABELS[achievement.rarity]}
              </span>
              <span className="text-white/40 text-xs">+{achievement.xpReward} XP</span>
            </div>

            {isUnlocked && !isClaimed && onClaim && (
              <button
                onClick={onClaim}
                className="flex items-center gap-1 px-3 py-1 rounded-lg
                  bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30"
              >
                <Gift size={14} />
                Resgatar
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
