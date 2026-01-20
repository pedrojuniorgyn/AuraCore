'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { UsageMetrics } from '@/components/strategic/analytics/UsageMetrics';
import { EngagementChart } from '@/components/strategic/analytics/EngagementChart';
import { FeatureUsageChart } from '@/components/strategic/analytics/FeatureUsageChart';
import { EngagementHeatmap } from '@/components/strategic/analytics/EngagementHeatmap';
import { FunnelChart } from '@/components/strategic/analytics/FunnelChart';
import { PredictiveInsights } from '@/components/strategic/analytics/PredictiveInsights';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import type { TimeRangeKey } from '@/lib/analytics/analytics-types';

const TIME_RANGES: { value: TimeRangeKey; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ytd', label: 'Este ano' },
];

function AnalyticsPageInner() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('30d');
  const [compareMode, setCompareMode] = useState(true);

  const { data, isLoading, refresh } = useAnalyticsData(timeRange);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-white/60 mt-1">
              Métricas de uso e insights do módulo estratégico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
            <Calendar size={16} className="text-white/40 ml-2" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
              className="bg-transparent text-white text-sm py-2 pr-8 
                focus:outline-none cursor-pointer appearance-none"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value} className="bg-gray-900">
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2 rounded-xl text-sm transition-all
              ${
                compareMode
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}
          >
            Comparar
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 text-white/60 
              hover:text-white hover:bg-white/10 transition-all border border-white/10"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <button
            className="px-4 py-2 rounded-xl bg-white/5 text-white/60 
              hover:text-white hover:bg-white/10 transition-all
              flex items-center gap-2 border border-white/10"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </motion.div>

      {/* Metrics Overview */}
      <section className="mb-8">
        <UsageMetrics metrics={data?.metrics} isLoading={isLoading} />
      </section>

      {/* Engagement Chart */}
      <section className="mb-8">
        <EngagementChart data={data?.engagement} isLoading={isLoading} />
      </section>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Feature Usage */}
        <FeatureUsageChart features={data?.featureUsage} isLoading={isLoading} />

        {/* Funnel */}
        <FunnelChart steps={data?.funnel} isLoading={isLoading} />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Heatmap */}
        <EngagementHeatmap data={data?.heatmap} isLoading={isLoading} />

        {/* Predictive Insights */}
        <PredictiveInsights insights={data?.insights} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default memo(AnalyticsPageInner);
