'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { FunnelStep } from '@/lib/analytics/analytics-types';

interface FunnelChartProps {
  steps?: FunnelStep[] | null;
  title?: string;
  isLoading?: boolean;
}

function FunnelChartInner({
  steps,
  title = 'Funil de Conversão',
  isLoading,
}: FunnelChartProps) {
  if (isLoading || !steps) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-64 animate-pulse bg-white/5 rounded-xl" />
      </div>
    );
  }

  const maxCount = steps[0]?.count || 1;

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-6">{title}</h3>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const widthPercent = (step.count / maxCount) * 100;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/80 text-sm">{step.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {step.count.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-white/40 text-sm">
                    ({step.percent.toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div className="relative h-10 bg-white/5 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
                />

                {/* Dropoff indicator */}
                {index > 0 && step.dropoff > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 text-xs">
                    -{step.dropoff.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="w-0.5 h-4 bg-white/10" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export const FunnelChart = memo(FunnelChartInner);
