"use client";

/**
 * Página: War Room Premium
 * Central de Comando Estratégico com LIVE updates
 * 
 * @module app/(dashboard)/strategic/war-room
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { WarRoomHeader } from '@/components/strategic/WarRoomHeader';
import { HealthScoreRing } from '@/components/strategic/HealthScoreRing';
import { PerspectiveCardSimple } from '@/components/strategic/PerspectiveCardSimple';
import { CriticalAlertPanel, type CriticalAlert } from '@/components/strategic/CriticalAlertPanel';
import { PriorityActionsCard, type PriorityAction } from '@/components/strategic/PriorityActionsCard';
import { WeeklyTrendChart } from '@/components/strategic/WeeklyTrendChart';
import { AuroraInsightCard } from '@/components/strategic/AuroraInsightCard';
import { AIInsightWidget } from '@/components/ai';
import { VoiceChatPanel } from '@/components/voice';

interface WarRoomData {
  healthScore: number;
  previousHealthScore?: number;
  alerts: CriticalAlert[];
  perspectives: Array<{
    perspective: 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL' | 'LEARNING';
    score: number;
    kpiCount: number;
    onTrack: number;
    atRisk: number;
    critical: number;
    trend: number;
  }>;
  weeklyTrend: Array<{ day: string; score: number }>;
  priorityActions: PriorityAction[];
  aiInsight: string;
}

// Empty state para quando não há dados da API (valores zerados)
const EMPTY_DATA: WarRoomData = {
  healthScore: 0,
  previousHealthScore: undefined,
  alerts: [],
  perspectives: [
    { perspective: 'FINANCIAL', score: 0, kpiCount: 0, onTrack: 0, atRisk: 0, critical: 0, trend: 0 },
    { perspective: 'CUSTOMER', score: 0, kpiCount: 0, onTrack: 0, atRisk: 0, critical: 0, trend: 0 },
    { perspective: 'INTERNAL', score: 0, kpiCount: 0, onTrack: 0, atRisk: 0, critical: 0, trend: 0 },
    { perspective: 'LEARNING', score: 0, kpiCount: 0, onTrack: 0, atRisk: 0, critical: 0, trend: 0 },
  ],
  weeklyTrend: [],
  priorityActions: [],
  aiInsight: 'Nenhum insight disponível. Configure KPIs e planos de ação para receber análises da Aurora AI.',
};

export default function WarRoomPage() {
  const router = useRouter();
  const [data, setData] = useState<WarRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const refreshInterval = 30; // seconds

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/strategic/war-room/dashboard');
      if (response.ok) {
        const result = await response.json();
        // Normalizar dados da API
        setData({
          healthScore: result.healthScore ?? EMPTY_DATA.healthScore,
          previousHealthScore: result.previousHealthScore,
          alerts: result.criticalKpis?.map((k: Record<string, unknown>, i: number) => ({
            id: String(k.id || i),
            type: 'CRITICAL' as const,
            title: k.name as string || 'KPI Crítico',
            description: `Variação: ${k.variance}%`,
            metric: { current: k.currentValue as number, target: k.targetValue as number, unit: k.unit as string || '%' },
            kpiId: k.id as string,
          })) || EMPTY_DATA.alerts,
          perspectives: result.perspectives || EMPTY_DATA.perspectives,
          weeklyTrend: result.weeklyTrend || EMPTY_DATA.weeklyTrend,
          priorityActions: result.overduePlans?.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            code: p.code as string,
            title: p.what as string,
            status: (p.daysOverdue as number) > 0 ? 'OVERDUE' : 'AT_RISK' as const,
            daysRemaining: -(p.daysOverdue as number),
          })) || EMPTY_DATA.priorityActions,
          aiInsight: result.aiInsight || EMPTY_DATA.aiInsight,
        });
      } else {
        setData(EMPTY_DATA);
      }
    } catch (error) {
      console.error('Erro ao carregar War Room:', error);
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const handleDismissAlert = async (id: string) => {
    try {
      await fetch(`/api/strategic/alerts/${id}/dismiss`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Erro ao dispensar alerta:', error);
    }
  };

  const handleViewKpi = (kpiId: string) => {
    router.push(`/strategic/kpis/${kpiId}`);
  };

  const handleCreatePlan = (alertId: string) => {
    router.push(`/strategic/action-plans/new?alertId=${alertId}`);
  };

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('open-aurora-chat'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <WarRoomHeader
        lastUpdate={lastUpdate}
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onRefresh={handleRefresh}
        onFullscreen={handleFullscreen}
      />

      {loading && !data ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">Carregando War Room...</p>
          </div>
        </div>
      ) : data && (
        <div className="grid grid-cols-12 gap-6">
          {/* Conteúdo Principal - 9 colunas */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Row 1: Health Score + Alerts */}
          <div className="grid grid-cols-12 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-4"
            >
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center h-full flex flex-col justify-center">
                <h3 className="text-lg font-bold text-white mb-4">Health Score</h3>
                <div className="flex justify-center">
                  <HealthScoreRing
                    score={data.healthScore}
                    previousScore={data.previousHealthScore}
                    size="xl"
                  />
                </div>
                {data.previousHealthScore !== undefined && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className={`text-sm font-medium ${
                      data.healthScore > data.previousHealthScore 
                        ? 'text-green-400' 
                        : data.healthScore < data.previousHealthScore 
                          ? 'text-red-400' 
                          : 'text-white/50'
                    }`}>
                      {data.healthScore > data.previousHealthScore ? '▲' : data.healthScore < data.previousHealthScore ? '▼' : '='} 
                      {' '}{Math.abs(data.healthScore - data.previousHealthScore)}% vs ontem
                    </span>
                  </div>
                )}
                <p className="text-white/40 text-xs mt-2">
                  Última atualização: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="col-span-8"
            >
              <CriticalAlertPanel
                alerts={data.alerts}
                onDismiss={handleDismissAlert}
                onViewKpi={handleViewKpi}
                onCreatePlan={handleCreatePlan}
                onViewAll={() => router.push('/strategic/alerts')}
              />
            </motion.div>
          </div>

          {/* Row 2: Perspectives */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📊 Perspectivas BSC
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {data.perspectives.map((p, i) => (
                <motion.div
                  key={p.perspective}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <PerspectiveCardSimple
                    perspective={p.perspective}
                    score={p.score}
                    kpiCount={p.kpiCount}
                    onTrack={p.onTrack}
                    atRisk={p.atRisk}
                    critical={p.critical}
                    trend={p.trend}
                    onClick={() => router.push(`/strategic/kpis?perspective=${p.perspective}`)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Row 3: Trend + Priority Actions */}
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <WeeklyTrendChart 
                data={data.weeklyTrend} 
                title="📈 Tendência Semanal"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <PriorityActionsCard
                actions={data.priorityActions}
                onViewAll={() => router.push('/strategic/action-plans')}
                onActionClick={(id) => router.push(`/strategic/action-plans/${id}`)}
              />
            </motion.div>
          </div>

          {/* Row 4: Aurora AI Insight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🤖 Insight Aurora AI
            </h3>
            <AuroraInsightCard
              insight={data.aiInsight}
              onChat={handleOpenChat}
            />
          </motion.div>
          </div>

          {/* Sidebar Direita - 3 colunas */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Voice Chat Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <VoiceChatPanel
                title="Comando por Voz"
                agentType="strategic"
                context={{
                  module: 'strategic',
                  screen: 'war-room',
                }}
                showHistory={true}
              />
            </motion.div>

            {/* AI Insight Widget - Inline na sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AIInsightWidget
                agentType="strategic"
                context={{
                  module: 'strategic',
                  screen: 'war-room',
                }}
                suggestedPrompts={[
                  'Status do War Room',
                  'Principais bloqueios',
                  'Próximos passos',
                ]}
                title="Insights"
                position="inline"
                defaultMinimized={true}
              />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
