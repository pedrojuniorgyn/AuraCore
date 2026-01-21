'use client';

import { motion } from 'framer-motion';
import type { Achievement } from '@/lib/gamification/gamification-types';
import { RARITY_COLORS } from '@/lib/gamification/gamification-types';

interface Props {
  achievements: Achievement[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
};

export function BadgeDisplay({ achievements, size = 'md', maxDisplay = 5 }: Props) {
  const displayBadges = achievements.slice(0, maxDisplay);
  const remaining = achievements.length - maxDisplay;

  return (
    <div className="flex items-center -space-x-2">
      {displayBadges.map((achievement, index) => (
        <motion.div
          key={achievement.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br 
            ${RARITY_COLORS[achievement.rarity]} p-0.5 ring-2 ring-gray-900`}
          title={achievement.name}
        >
          <div
            className="w-full h-full rounded-full bg-gray-900 
            flex items-center justify-center"
          >
            {achievement.icon}
          </div>
        </motion.div>
      ))}

      {remaining > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-white/10 
          flex items-center justify-center ring-2 ring-gray-900 text-white/60`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
