'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { LinkedKpi } from '@/lib/war-room/war-room-types';

interface Props {
  kpis: LinkedKpi[];
}

export function CrisisIndicators({ kpis }: Props) {
  const getStatusConfig = (status: LinkedKpi['status']) => {
    switch (status) {
      case 'critical':
        return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'CRÍTICO' };
      case 'warning':
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'ALERTA' };
      default:
        return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'OK' };
    }
  };

  const getProgressColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio >= 1) return 'bg-green-500';
    if (ratio >= 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <h3 className="text-white font-medium mb-4">Indicadores Críticos</h3>

      <div className="space-y-4">
        {kpis.map((kpi, index) => {
          const statusConfig = getStatusConfig(kpi.status);
          const progressPercent = Math.min(100, (kpi.currentValue / kpi.targetValue) * 100);
          const isAboveTarget = kpi.currentValue >= kpi.targetValue;

          return (
            <motion.div
              key={kpi.kpiId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-xl bg-white/5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <span className="text-white/80 text-sm font-medium">{kpi.kpiName}</span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold text-white">{kpi.currentValue}%</span>
                  <span className="text-white/40 text-sm ml-2">(meta: {kpi.targetValue}%)</span>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${isAboveTarget ? 'text-green-400' : 'text-red-400'}`}
                >
                  {isAboveTarget ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Math.abs(kpi.currentValue - kpi.targetValue)}%</span>
                </div>
              </div>

              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${getProgressColor(kpi.currentValue, kpi.targetValue)}`}
                />
              </div>

              {kpi.status === 'critical' && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                  <AlertTriangle size={12} />
                  <span>Abaixo do threshold crítico ({kpi.threshold}%)</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {kpis.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <p>Nenhum KPI vinculado</p>
        </div>
      )}
    </div>
  );
}
