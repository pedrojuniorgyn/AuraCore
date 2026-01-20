"use client";

import { Card, Title, Text, Flex, ProgressCircle, BadgeDelta, type DeltaType } from '@tremor/react';

type KpiStatus = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

interface KpiGaugeProps {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: KpiStatus;
  deviationPercent?: number;
  onClick?: (id: string) => void;
}

// Tailwind safelist pattern - classes completas para PurgeCSS/JIT
const statusClasses: Record<KpiStatus, {
  tremorColor: 'emerald' | 'amber' | 'red' | 'gray';
  progressText: string;
  badgeBg: string;
  badgeText: string;
}> = {
  GREEN: {
    tremorColor: 'emerald',
    progressText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
  },
  YELLOW: {
    tremorColor: 'amber',
    progressText: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
  },
  RED: {
    tremorColor: 'red',
    progressText: 'text-red-400',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
  },
  GRAY: {
    tremorColor: 'gray',
    progressText: 'text-gray-400',
    badgeBg: 'bg-gray-500/20',
    badgeText: 'text-gray-400',
  },
};

const statusLabels: Record<KpiStatus, string> = {
  GREEN: 'No Prazo',
  YELLOW: 'Atenção',
  RED: 'Crítico',
  GRAY: 'Sem Dados',
};

function getDeltaType(deviation?: number): DeltaType {
  if (deviation === undefined) return 'unchanged';
  if (deviation > 0) return 'increase';
  if (deviation < 0) return 'decrease';
  return 'unchanged';
}

function formatValue(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (unit === 'dias') return `${value.toFixed(0)} dias`;
  return `${value.toLocaleString('pt-BR')} ${unit}`;
}

export function KpiGauge({
  id,
  code,
  name,
  currentValue,
  targetValue,
  unit,
  status,
  deviationPercent,
  onClick,
}: KpiGaugeProps) {
  const classes = statusClasses[status];
  const progress = targetValue !== 0 ? (currentValue / targetValue) * 100 : 0;
  const deltaType = getDeltaType(deviationPercent);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gray-900/50 border-gray-800"
      onClick={() => onClick?.(id)}
    >
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Text className="text-gray-500 text-xs font-mono">{code}</Text>
          <Title className="text-sm text-white mt-1 line-clamp-2">{name}</Title>
        </div>
        <ProgressCircle
          value={Math.min(progress, 100)}
          size="md"
          color={classes.tremorColor}
          showAnimation={true}
        >
          <span className={`text-xs font-semibold ${classes.progressText}`}>
            {Math.round(progress)}%
          </span>
        </ProgressCircle>
      </Flex>

      <Flex className="mt-4" justifyContent="between" alignItems="end">
        <div>
          <Text className="text-gray-500 text-xs">Atual</Text>
          <Text className="text-white font-semibold">
            {formatValue(currentValue, unit)}
          </Text>
        </div>
        <div className="text-right">
          <Text className="text-gray-500 text-xs">Meta</Text>
          <Text className="text-gray-400">
            {formatValue(targetValue, unit)}
          </Text>
        </div>
      </Flex>

      <Flex className="mt-3" justifyContent="between" alignItems="center">
        <span className={`text-xs px-2 py-1 rounded-full ${classes.badgeBg} ${classes.badgeText}`}>
          {statusLabels[status]}
        </span>
        {deviationPercent !== undefined && (
          <BadgeDelta deltaType={deltaType} size="xs">
            {deviationPercent > 0 ? '+' : ''}{deviationPercent.toFixed(1)}%
          </BadgeDelta>
        )}
      </Flex>
    </Card>
  );
}
