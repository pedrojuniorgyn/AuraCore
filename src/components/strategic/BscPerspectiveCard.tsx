"use client";

import { 
  Card, 
  Title, 
  Text, 
  Metric, 
  Flex, 
  ProgressBar,
  BadgeDelta,
  type DeltaType 
} from '@tremor/react';
import { 
  DollarSign, 
  Users, 
  Cog, 
  GraduationCap,
  type LucideIcon 
} from 'lucide-react';

type PerspectiveType = 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL_PROCESS' | 'LEARNING_GROWTH';

interface BscPerspectiveCardProps {
  perspective: PerspectiveType;
  title: string;
  goalCount: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsDelayed: number;
  avgProgress: number;
  previousProgress?: number;
}

// Tailwind safelist pattern - classes completas para PurgeCSS/JIT detectar
const perspectiveConfig: Record<PerspectiveType, { 
  icon: LucideIcon; 
  tremorColor: 'emerald' | 'blue' | 'amber' | 'purple';
  bgGradient: string;
  iconBg: string;
  iconText: string;
}> = {
  FINANCIAL: {
    icon: DollarSign,
    tremorColor: 'emerald',
    bgGradient: 'from-emerald-500/20 to-green-500/20',
    iconBg: 'bg-emerald-500/30',
    iconText: 'text-emerald-400',
  },
  CUSTOMER: {
    icon: Users,
    tremorColor: 'blue',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
    iconBg: 'bg-blue-500/30',
    iconText: 'text-blue-400',
  },
  INTERNAL_PROCESS: {
    icon: Cog,
    tremorColor: 'amber',
    bgGradient: 'from-amber-500/20 to-orange-500/20',
    iconBg: 'bg-amber-500/30',
    iconText: 'text-amber-400',
  },
  LEARNING_GROWTH: {
    icon: GraduationCap,
    tremorColor: 'purple',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
    iconBg: 'bg-purple-500/30',
    iconText: 'text-purple-400',
  },
};

const perspectiveLabels: Record<PerspectiveType, string> = {
  FINANCIAL: 'Financeira',
  CUSTOMER: 'Cliente',
  INTERNAL_PROCESS: 'Processos Internos',
  LEARNING_GROWTH: 'Aprendizado e Crescimento',
};

function getDeltaType(current: number, previous?: number): DeltaType {
  if (previous === undefined) return 'unchanged';
  if (current > previous) return 'increase';
  if (current < previous) return 'decrease';
  return 'unchanged';
}

export function BscPerspectiveCard({
  perspective,
  title,
  goalCount,
  goalsOnTrack,
  goalsAtRisk,
  goalsDelayed,
  avgProgress,
  previousProgress,
}: BscPerspectiveCardProps) {
  const config = perspectiveConfig[perspective];
  const Icon = config.icon;
  const deltaType = getDeltaType(avgProgress, previousProgress);
  const deltaValue = previousProgress !== undefined 
    ? `${(avgProgress - previousProgress).toFixed(1)}%` 
    : undefined;

  return (
    <Card 
      className={`bg-gradient-to-br ${config.bgGradient} border-0 shadow-lg hover:shadow-xl transition-shadow`}
      decoration="left"
      decorationColor={config.tremorColor}
    >
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Text className="text-gray-400 text-xs uppercase tracking-wider">
            {perspectiveLabels[perspective]}
          </Text>
          <Title className="mt-1 text-white">{title}</Title>
        </div>
        <div className={`p-2 rounded-lg ${config.iconBg}`}>
          <Icon className={`w-6 h-6 ${config.iconText}`} />
        </div>
      </Flex>

      <Flex className="mt-4" justifyContent="start" alignItems="baseline">
        <Metric className="text-white">{avgProgress.toFixed(0)}%</Metric>
        {deltaValue && (
          <BadgeDelta 
            deltaType={deltaType} 
            size="xs"
            className="ml-2"
          >
            {deltaValue}
          </BadgeDelta>
        )}
      </Flex>

      <ProgressBar 
        value={avgProgress} 
        color={config.tremorColor} 
        className="mt-3"
      />

      <Flex className="mt-4" justifyContent="between">
        <div className="text-center">
          <Text className="text-gray-500 text-xs">No Prazo</Text>
          <Text className="text-emerald-400 font-semibold">{goalsOnTrack}</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">Em Risco</Text>
          <Text className="text-amber-400 font-semibold">{goalsAtRisk}</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">Atrasados</Text>
          <Text className="text-red-400 font-semibold">{goalsDelayed}</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">Total</Text>
          <Text className="text-gray-300 font-semibold">{goalCount}</Text>
        </div>
      </Flex>
    </Card>
  );
}
