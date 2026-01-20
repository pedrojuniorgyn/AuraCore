"use client";

import { Card, Title, Text, Flex, ProgressCircle } from '@tremor/react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Trend = 'UP' | 'DOWN' | 'STABLE';

interface HealthScoreRingProps {
  score: number;
  previousScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'amber';
  if (score >= 40) return 'orange';
  return 'red';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Atenção';
  return 'Crítico';
}

function getTrend(current: number, previous?: number): Trend {
  if (previous === undefined) return 'STABLE';
  if (current > previous) return 'UP';
  if (current < previous) return 'DOWN';
  return 'STABLE';
}

const TrendIcon = ({ trend }: { trend: Trend }) => {
  switch (trend) {
    case 'UP':
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case 'DOWN':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

export function HealthScoreRing({
  score,
  previousScore,
  label = 'Saúde Estratégica',
  size = 'lg',
}: HealthScoreRingProps) {
  const color = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const trend = getTrend(score, previousScore);
  const delta = previousScore !== undefined ? score - previousScore : 0;

  const sizeMap = {
    sm: 'sm',
    md: 'md', 
    lg: 'lg',
    xl: 'xl',
  } as const;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Text className="text-gray-400 text-xs uppercase tracking-wider">
            {label}
          </Text>
          <Title className="mt-1 text-white">{scoreLabel}</Title>
        </div>
        <Activity className={`w-6 h-6 text-${color}-400`} />
      </Flex>

      <Flex justifyContent="center" className="mt-6">
        <ProgressCircle
          value={score}
          size={sizeMap[size]}
          color={color}
          showAnimation={true}
        >
          <div className="text-center">
            <span className={`text-3xl font-bold text-${color}-400`}>
              {Math.round(score)}
            </span>
            <span className="text-gray-500 text-sm">%</span>
          </div>
        </ProgressCircle>
      </Flex>

      {previousScore !== undefined && (
        <Flex justifyContent="center" alignItems="center" className="mt-4 gap-2">
          <TrendIcon trend={trend} />
          <Text className={`text-sm ${
            trend === 'UP' ? 'text-emerald-400' : 
            trend === 'DOWN' ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs período anterior
          </Text>
        </Flex>
      )}

      <Flex justifyContent="around" className="mt-6">
        <div className="text-center">
          <Text className="text-gray-500 text-xs">80-100</Text>
          <Text className="text-emerald-400 text-xs">Excelente</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">60-79</Text>
          <Text className="text-amber-400 text-xs">Bom</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">40-59</Text>
          <Text className="text-orange-400 text-xs">Atenção</Text>
        </div>
        <div className="text-center">
          <Text className="text-gray-500 text-xs">0-39</Text>
          <Text className="text-red-400 text-xs">Crítico</Text>
        </div>
      </Flex>
    </Card>
  );
}
