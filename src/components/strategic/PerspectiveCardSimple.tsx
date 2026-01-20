"use client";

/**
 * PerspectiveCardSimple - Card simplificado de perspectiva BSC para War Room
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { DollarSign, Users, Cog, GraduationCap, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

type PerspectiveType = 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL' | 'LEARNING';

interface Props {
  perspective: PerspectiveType;
  score: number;
  kpiCount: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  trend: number;
  onClick?: () => void;
}

const PERSPECTIVE_CONFIG: Record<PerspectiveType, {
  icon: LucideIcon;
  label: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  iconColor: string;
}> = {
  FINANCIAL: {
    icon: DollarSign,
    label: 'Financeira',
    emoji: '💰',
    gradientFrom: 'from-green-500/20',
    gradientTo: 'to-emerald-500/20',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
  },
  CUSTOMER: {
    icon: Users,
    label: 'Cliente',
    emoji: '👥',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-cyan-500/20',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  INTERNAL: {
    icon: Cog,
    label: 'Processos',
    emoji: '⚙️',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  LEARNING: {
    icon: GraduationCap,
    label: 'Aprendizado',
    emoji: '📚',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-pink-500/20',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
};

export function PerspectiveCardSimple({
  perspective,
  score,
  kpiCount,
  onTrack,
  atRisk,
  critical,
  trend,
  onClick,
}: Props) {
  const config = PERSPECTIVE_CONFIG[perspective];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 rounded-xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}
        border border-white/10 backdrop-blur-sm text-left transition-all hover:border-white/20`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <span className="text-white/80 text-sm font-medium">{config.label}</span>
        </div>
        <div className={`p-1.5 rounded-lg ${config.iconBg}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-white">{score}%</span>
        {trend !== 0 && (
          <span className={`flex items-center gap-0.5 text-sm ${
            trend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* KPI Stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-green-400">{onTrack} 🟢</span>
        <span className="text-yellow-400">{atRisk} 🟡</span>
        <span className="text-red-400">{critical} 🔴</span>
        <span className="text-white/40 ml-auto">{kpiCount} KPIs</span>
      </div>
    </motion.button>
  );
}
