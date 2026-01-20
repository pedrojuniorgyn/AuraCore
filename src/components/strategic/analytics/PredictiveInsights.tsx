'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { PredictiveInsight } from '@/lib/analytics/analytics-types';

interface PredictiveInsightsProps {
  insights?: PredictiveInsight[] | null;
  isLoading?: boolean;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  opportunity: {
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  recommendation: {
    icon: Lightbulb,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
};

function PredictiveInsightsInner({ insights, isLoading }: PredictiveInsightsProps) {
  if (isLoading || !insights) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🔮</span>
        <h3 className="text-white font-semibold">Insights Preditivos</h3>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
            >
              <div className="flex gap-3">
                <Icon size={20} className={config.color} />

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="text-white font-medium">{insight.title}</h4>
                    <span className="text-white/40 text-xs">
                      {(insight.confidence * 100).toFixed(0)}% confiança
                    </span>
                  </div>

                  <p className="text-white/60 text-sm mt-1">{insight.description}</p>

                  {insight.relatedEntity && (
                    <div className="mt-2">
                      <span className="text-white/40 text-xs">
                        Relacionado: {insight.relatedEntity.name}
                      </span>
                    </div>
                  )}

                  {insight.actionUrl && (
                    <Link
                      href={insight.actionUrl}
                      className={`inline-flex items-center gap-1 mt-3 text-sm 
                        ${config.color} hover:underline`}
                    >
                      {insight.suggestedAction || 'Ver detalhes'}
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export const PredictiveInsights = memo(PredictiveInsightsInner);
