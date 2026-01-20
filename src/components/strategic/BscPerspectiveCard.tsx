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

const perspectiveConfig: Record<PerspectiveType, { 
  icon: LucideIcon; 
  color: string; 
  bgGradient: string;
}> = {
  FINANCIAL: {
    icon: DollarSign,
    color: 'emerald',
    bgGradient: 'from-emerald-500/20 to-green-500/20',
  },
  CUSTOMER: {
    icon: Users,
    color: 'blue',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
  },
  INTERNAL_PROCESS: {
    icon: Cog,
    color: 'amber',
    bgGradient: 'from-amber-500/20 to-orange-500/20',
  },
  LEARNING_GROWTH: {
    icon: GraduationCap,
    color: 'purple',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
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

  // Map color string to valid Tremor color
  const colorMap: Record<string, 'emerald' | 'blue' | 'amber' | 'purple'> = {
    'emerald': 'emerald',
    'blue': 'blue',
    'amber': 'amber',
    'purple': 'purple',
  };
  const decorationColor = colorMap[config.color] || 'purple';

  return (
    <Card 
      className={`bg-gradient-to-br ${config.bgGradient} border-0 shadow-lg hover:shadow-xl transition-shadow`}
      decoration="left"
      decorationColor={decorationColor}
    >
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Text className="text-gray-400 text-xs uppercase tracking-wider">
            {perspectiveLabels[perspective]}
          </Text>
          <Title className="mt-1 text-white">{title}</Title>
        </div>
        <div className={`p-2 rounded-lg bg-${config.color}-500/30`}>
          <Icon className={`w-6 h-6 text-${config.color}-400`} />
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
        color={decorationColor} 
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
