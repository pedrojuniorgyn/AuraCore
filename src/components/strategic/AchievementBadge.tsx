"use client";

/**
 * AchievementBadge - Badge de conquista com raridade e animações
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Lock, Trophy, Star, Target, Zap, Award, Crown, Flame, type LucideIcon } from 'lucide-react';

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xpReward: number;
  unlockedAt?: Date | string;
  progress?: number;
}

interface Props {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const RARITY_CONFIG: Record<BadgeRarity, {
  gradient: string;
  glow: string;
  label: string;
  border: string;
  animate?: boolean;
}> = {
  COMMON: { 
    gradient: 'from-gray-400 to-gray-600', 
    glow: '', 
    label: 'Comum',
    border: 'border-gray-500/30',
  },
  RARE: { 
    gradient: 'from-blue-400 to-blue-600', 
    glow: 'shadow-blue-500/30', 
    label: 'Raro',
    border: 'border-blue-500/30',
  },
  EPIC: { 
    gradient: 'from-purple-400 to-purple-600', 
    glow: 'shadow-purple-500/30', 
    label: 'Épico',
    border: 'border-purple-500/30',
  },
  LEGENDARY: { 
    gradient: 'from-yellow-400 via-orange-500 to-red-500', 
    glow: 'shadow-yellow-500/40', 
    label: 'Lendário',
    border: 'border-yellow-500/30',
    animate: true,
  },
};

const ICON_MAP: Record<string, LucideIcon> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  zap: Zap,
  award: Award,
  crown: Crown,
  flame: Flame,
};

const SIZE_CONFIG = {
  sm: { container: 'w-16 h-16', icon: 16, text: 'text-[10px]' },
  md: { container: 'w-20 h-20', icon: 20, text: 'text-xs' },
  lg: { container: 'w-24 h-24', icon: 24, text: 'text-sm' },
};

export function AchievementBadge({ badge, size = 'md', onClick }: Props) {
  const rarity = RARITY_CONFIG[badge.rarity];
  const sizeConf = SIZE_CONFIG[size];
  const isLocked = !badge.unlockedAt;
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -4 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
    >
      {/* Glow for unlocked */}
      {!isLocked && (
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${rarity.gradient} 
          blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
      )}

      {/* Badge Container */}
      <div className={`
        relative ${sizeConf.container} rounded-2xl flex flex-col items-center justify-center
        border-2 ${rarity.border} transition-all
        ${isLocked 
          ? 'bg-white/5 grayscale opacity-50' 
          : `bg-gradient-to-br ${rarity.gradient} shadow-lg ${rarity.glow}`
        }
      `}>
        {/* Lock or Icon */}
        {isLocked ? (
          <>
            <Lock className="text-white/30" size={sizeConf.icon} />
            {badge.progress !== undefined && badge.progress > 0 && (
              <div className="absolute bottom-1 left-1 right-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/30 rounded-full transition-all"
                  style={{ width: `${badge.progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <Icon className="text-white" size={sizeConf.icon} />
        )}

        {/* Legendary sparkle effect */}
        {badge.rarity === 'LEGENDARY' && !isLocked && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full" />
          </motion.div>
        )}
      </div>

      {/* Rarity Label */}
      <span className={`block mt-1 ${sizeConf.text} text-center font-medium
        ${isLocked ? 'text-white/30' : 'text-white/70'}`}>
        {rarity.label}
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
        rounded-lg bg-gray-900 border border-white/10 opacity-0 group-hover:opacity-100
        transition-opacity pointer-events-none whitespace-nowrap z-10 min-w-[150px]">
        <p className="text-white font-bold text-sm">{badge.name}</p>
        <p className="text-white/60 text-xs">{badge.description}</p>
        <p className="text-yellow-400 text-xs mt-1">+{badge.xpReward} XP</p>
      </div>
    </motion.button>
  );
}
