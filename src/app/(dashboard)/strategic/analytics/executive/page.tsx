'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Download, Target } from 'lucide-react';
import useSWR from 'swr';
import type { ExecutiveDashboardOutput } from '@/modules/strategic/application/queries/GetExecutiveDashboardQuery';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ExecutiveDashboardPage() {
  const { data, isLoading, mutate } = useSWR<ExecutiveDashboardOutput>(
    '/api/strategic/analytics/executive/summary',
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh a cada 30s
      revalidateOnFocus: true,
    }
  );

  const handleRefresh = () => {
    mutate();
  };

  const handleExport = async () => {
    try {
      // Calcular período (últimos 30 dias)
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'BSC_COMPLETE',
          period: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
          options: {
            includeCharts: false,
            orientation: 'portrait',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      // Download do PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_executivo_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Target className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Executivo</h1>
            <p className="text-white/60 mt-1">
              Visão consolidada dos KPIs críticos em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 text-white/60 
              hover:text-white hover:bg-white/10 transition-all border border-white/10"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/60 
              hover:text-white hover:bg-white/10 transition-all
              flex items-center gap-2 border border-white/10"
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && !data && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={32} className="text-white/40 animate-spin" />
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total KPIs */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-2">Total de KPIs</div>
            <div className="text-3xl font-bold text-white">{data.summary.totalKpis}</div>
          </div>

          {/* KPIs Verdes */}
          <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20">
            <div className="text-green-200/60 text-sm mb-2">No Alvo</div>
            <div className="text-3xl font-bold text-green-400">
              {data.summary.greenPercent}%
            </div>
            <div className="text-green-200/40 text-xs mt-1">
              {data.summary.totalKpis > 0 && 
                Math.round((data.summary.greenPercent / 100) * data.summary.totalKpis)} KPIs
            </div>
          </div>

          {/* KPIs Críticos */}
          <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20">
            <div className="text-red-200/60 text-sm mb-2">Críticos</div>
            <div className="text-3xl font-bold text-red-400">
              {data.summary.criticalCount}
            </div>
            <div className="text-red-200/40 text-xs mt-1">
              {data.summary.redPercent}% do total
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
            <div className="text-blue-200/60 text-sm mb-2">Taxa de Atingimento</div>
            <div className="text-3xl font-bold text-blue-400">
              {data.summary.avgCompletion}%
            </div>
            <div className="text-blue-200/40 text-xs mt-1">Média geral</div>
          </div>
        </motion.div>
      )}

      {/* KPIs Críticos */}
      {data && data.criticalKpis.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4">KPIs Críticos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.criticalKpis.map((kpi: typeof data.criticalKpis[0], index: number) => (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-red-500/5 backdrop-blur-xl rounded-xl p-6 border border-red-500/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-xs text-red-300/60 mb-1">{kpi.code}</div>
                    <div className="text-white font-semibold">{kpi.name}</div>
                    <div className="text-xs text-white/40 mt-1">{kpi.perspective}</div>
                  </div>
                  <div className={`flex items-center gap-1 ${
                    kpi.trend > 0 ? 'text-green-400' : kpi.trend < 0 ? 'text-red-400' : 'text-white/40'
                  }`}>
                    {kpi.trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span className="text-sm font-semibold">{Math.abs(kpi.trend)}%</span>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {kpi.currentValue.toFixed(1)} {kpi.unit}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      Meta: {kpi.targetValue.toFixed(1)} {kpi.unit}
                    </div>
                  </div>
                  <div className="text-xs text-white/40">
                    {new Date(kpi.lastUpdated).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Top Performers */}
      {data && data.topPerformers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4">Destaques Positivos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {data.topPerformers.map((kpi: typeof data.topPerformers[0], index: number) => (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-green-500/5 backdrop-blur-xl rounded-xl p-6 border border-green-500/20"
              >
                <div className="text-xs text-green-300/60 mb-1">{kpi.code}</div>
                <div className="text-white font-semibold mb-2">{kpi.name}</div>
                <div className="text-2xl font-bold text-green-400">
                  {kpi.currentValue.toFixed(1)} {kpi.unit}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Meta: {kpi.targetValue.toFixed(1)} {kpi.unit}
                </div>
                <div className={`flex items-center gap-1 mt-2 ${
                  kpi.trend > 0 ? 'text-green-400' : 'text-white/40'
                }`}>
                  <TrendingUp size={14} />
                  <span className="text-xs font-semibold">+{kpi.trend}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Perspectivas BSC */}
      {data && data.perspectiveSummaries.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Perspectivas BSC</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.perspectiveSummaries.map((perspective: typeof data.perspectiveSummaries[0], index: number) => (
              <motion.div
                key={perspective.perspective}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10"
              >
                <div className="text-sm text-white/60 mb-3">{perspective.perspective}</div>
                <div className="text-2xl font-bold text-white mb-4">
                  {perspective.totalKpis} KPIs
                </div>

                {/* Status Distribution */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-400">Verde</span>
                    <span className="text-white">{perspective.greenCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-400">Amarelo</span>
                    <span className="text-white">{perspective.yellowCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-400">Vermelho</span>
                    <span className="text-white">{perspective.redCount}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-white/40">Taxa de Atingimento</div>
                  <div className="text-lg font-bold text-white">{perspective.avgCompletion}%</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Last Updated */}
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-white/40"
        >
          Última atualização: {new Date(data.lastUpdated).toLocaleString('pt-BR')}
        </motion.div>
      )}
    </div>
  );
}

export default memo(ExecutiveDashboardPage);
