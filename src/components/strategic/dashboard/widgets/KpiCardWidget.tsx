'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_KPI = {
  name: 'Taxa de Entrega (OTD)',
  value: 92.5,
  target: 95,
  unit: '%',
  trend: 'up' as const,
  variation: 3.2,
  status: 'warning' as const,
};

export function KpiCardWidget({ widget }: Props) {
  const config = widget.config as { showTrend?: boolean; showVariation?: boolean; showTarget?: boolean; showStatus?: boolean };
  const kpi = MOCK_KPI;

  const statusColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  };

  const getProgressColor = () => {
    const progress = (kpi.value / kpi.target) * 100;
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-2">
          <span
            className={`text-3xl font-bold ${config.showStatus ? statusColors[kpi.status] : 'text-white'}`}
          >
            {kpi.value}
            {kpi.unit}
          </span>
          {config.showTrend && (
            <div
              className={`flex items-center gap-1 text-sm
              ${kpi.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}
            >
              {kpi.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {config.showVariation && <span>{kpi.variation}%</span>}
            </div>
          )}
        </div>

        {config.showTarget && (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Target size={14} />
            <span>
              Meta: {kpi.target}
              {kpi.unit}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (kpi.value / kpi.target) * 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${getProgressColor()}`}
          />
        </div>
      </div>
    </div>
  );
}
