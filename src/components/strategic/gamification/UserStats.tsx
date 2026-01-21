'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, CheckCircle, Flame, Calendar, TrendingUp } from 'lucide-react';
import type { UserPoints } from '@/lib/gamification/gamification-types';

interface Props {
  points: UserPoints;
}

export function UserStats({ points }: Props) {
  const stats = [
    {
      label: 'Total XP',
      value: points.totalXp.toLocaleString(),
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Conquistas',
      value: `${points.unlockedAchievements}/${points.totalAchievements}`,
      icon: Target,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Sequência Atual',
      value: `${points.currentStreak} dias`,
      icon: Flame,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Maior Sequência',
      value: `${points.longestStreak} dias`,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'XP de KPIs',
      value: points.xpFromKpis.toLocaleString(),
      icon: CheckCircle,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'XP de Planos',
      value: points.xpFromActionPlans.toLocaleString(),
      icon: Calendar,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl ${stat.bg} border border-white/5`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon className={stat.color} size={20} />
              <span className="text-white/60 text-sm">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
