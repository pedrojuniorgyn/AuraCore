'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Users, Activity, Target, Zap } from 'lucide-react';
import type { OverviewMetrics, MetricValue } from '@/lib/analytics/analytics-types';

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  label: string;
  metric: MetricValue;
  icon: React.ElementType;
  delay?: number;
}

const MetricCard = memo(function MetricCard({
  label,
  metric,
  icon: Icon,
  delay = 0,
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-white/40',
  };

  const TrendIcon =
    metric.trend === 'up'
      ? TrendingUp
      : metric.trend === 'down'
        ? TrendingDown
        : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/5 rounded-2xl p-6 border border-white/10"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-purple-500/20">
          <Icon size={20} className="text-purple-400" />
        </div>
        <span className="text-white/60 text-sm">{label}</span>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-white">
          {metric.current.toLocaleString('pt-BR')}
        </span>

        <div className={`flex items-center gap-1 ${trendColors[metric.trend]}`}>
          <TrendIcon size={16} />
          <span className="text-sm font-medium">
            {metric.changePercent > 0 ? '+' : ''}
            {metric.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-2 text-white/40 text-xs">
        vs. período anterior: {metric.previous.toLocaleString('pt-BR')}
      </div>
    </motion.div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

interface UsageMetricsProps {
  metrics?: OverviewMetrics | null;
  isLoading?: boolean;
}

function UsageMetricsInner({ metrics, isLoading }: UsageMetricsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Usuários Ativos"
        metric={metrics.activeUsers}
        icon={Users}
        delay={0}
      />
      <MetricCard
        label="Sessões Diárias"
        metric={metrics.dailySessions}
        icon={Activity}
        delay={0.1}
      />
      <MetricCard
        label="KPIs Atualizados"
        metric={metrics.kpisUpdated}
        icon={Target}
        delay={0.2}
      />
      <MetricCard
        label="Ações Criadas"
        metric={metrics.actionsCreated}
        icon={Zap}
        delay={0.3}
      />
    </div>
  );
}

export const UsageMetrics = memo(UsageMetricsInner);
