'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { FeatureUsage } from '@/lib/analytics/analytics-types';

interface FeatureUsageChartProps {
  features?: FeatureUsage[] | null;
  isLoading?: boolean;
}

function FeatureUsageChartInner({ features, isLoading }: FeatureUsageChartProps) {
  if (isLoading || !features) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-64 animate-pulse bg-white/5 rounded-xl" />
      </div>
    );
  }

  const maxUsage = Math.max(...features.map((f) => f.usage));

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-6">Uso de Features</h3>

      <div className="space-y-4">
        {features.map((feature, index) => {
          const widthPercent = (feature.usage / maxUsage) * 100;

          return (
            <motion.div
              key={feature.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/80 text-sm">{feature.label}</span>
                <span className="text-white font-medium">{feature.usage}%</span>
              </div>

              <div className="relative h-6 bg-white/5 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
                />

                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-white/60 text-xs">
                    {feature.sessions} sessões • {feature.avgTimeSpent.toFixed(1)}min
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export const FeatureUsageChart = memo(FeatureUsageChartInner);
