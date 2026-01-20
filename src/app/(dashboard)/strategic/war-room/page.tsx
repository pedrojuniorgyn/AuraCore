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

// Dados mock para fallback
const MOCK_DATA: WarRoomData = {
  healthScore: 72,
  previousHealthScore: 69,
  alerts: [
    { id: '1', type: 'CRITICAL', title: 'OTD abaixo da meta', description: 'Índice de entregas no prazo caiu para 67%', metric: { current: 67, target: 95, unit: '%' }, kpiId: 'kpi-otd' },
    { id: '2', type: 'CRITICAL', title: 'EBITDA negativo', description: 'Filiais SP e RJ com margem negativa', kpiId: 'kpi-ebitda' },
    { id: '3', type: 'WARNING', title: '3 planos atrasados', description: 'Ações com mais de 15 dias de atraso' },
  ],
  perspectives: [
    { perspective: 'FINANCIAL', score: 75, kpiCount: 5, onTrack: 2, atRisk: 2, critical: 1, trend: -2 },
    { perspective: 'CUSTOMER', score: 82, kpiCount: 3, onTrack: 2, atRisk: 1, critical: 0, trend: 5 },
    { perspective: 'INTERNAL', score: 68, kpiCount: 8, onTrack: 3, atRisk: 3, critical: 2, trend: -8 },
    { perspective: 'LEARNING', score: 91, kpiCount: 4, onTrack: 4, atRisk: 0, critical: 0, trend: 3 },
  ],
  weeklyTrend: [
    { day: 'Seg', score: 68 },
    { day: 'Ter', score: 70 },
    { day: 'Qua', score: 69 },
    { day: 'Qui', score: 71 },
    { day: 'Sex', score: 72 },
  ],
  priorityActions: [
    { id: '1', code: 'PDC-002', title: 'Reverter queda do OTD', status: 'OVERDUE', daysRemaining: -3 },
    { id: '2', code: 'PDC-005', title: 'Reduzir custos operacionais', status: 'AT_RISK', daysRemaining: 5 },
    { id: '3', code: 'PDC-008', title: 'Capacitar equipe entregas', status: 'AT_RISK', daysRemaining: 7 },
    { id: '4', code: 'PDC-012', title: 'Melhorar NPS clientes', status: 'ON_TRACK', daysRemaining: 10 },
    { id: '5', code: 'PDC-015', title: 'Implantar novo TMS', status: 'ON_TRACK', daysRemaining: 15 },
  ],
  aiInsight: 'O KPI OTD apresenta tendência de queda há 3 semanas consecutivas. Recomendo priorizar o plano de ação PDC-002 e alocar recursos adicionais para a operação de última milha. A análise indica que 60% dos atrasos ocorrem na região metropolitana de SP.',
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
          healthScore: result.healthScore ?? MOCK_DATA.healthScore,
          previousHealthScore: result.previousHealthScore,
          alerts: result.criticalKpis?.map((k: Record<string, unknown>, i: number) => ({
            id: String(k.id || i),
            type: 'CRITICAL' as const,
            title: k.name as string || 'KPI Crítico',
            description: `Variação: ${k.variance}%`,
            metric: { current: k.currentValue as number, target: k.targetValue as number, unit: k.unit as string || '%' },
            kpiId: k.id as string,
          })) || MOCK_DATA.alerts,
          perspectives: result.perspectives || MOCK_DATA.perspectives,
          weeklyTrend: result.weeklyTrend || MOCK_DATA.weeklyTrend,
          priorityActions: result.overduePlans?.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            code: p.code as string,
            title: p.what as string,
            status: (p.daysOverdue as number) > 0 ? 'OVERDUE' : 'AT_RISK' as const,
            daysRemaining: -(p.daysOverdue as number),
          })) || MOCK_DATA.priorityActions,
          aiInsight: result.aiInsight || MOCK_DATA.aiInsight,
        });
      } else {
        setData(MOCK_DATA);
      }
    } catch (error) {
      console.error('Erro ao carregar War Room:', error);
      setData(MOCK_DATA);
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
        <div className="space-y-6">
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
      )}
    </div>
  );
}
