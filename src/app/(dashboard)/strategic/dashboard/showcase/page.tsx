'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, CheckCircle2, Clock, AlertTriangle, 
  RefreshCw, Settings, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import {
  HealthScoreCard,
  MetricCard,
  PerspectivesCard,
  AlertsCard,
  QuickActionsCard,
  PlansCard,
  AIInsightsCard,
} from '@/components/strategic/dashboard-showcase';
import { fetchAPI } from '@/lib/api';

// ============================================
// TIPOS
// ============================================
interface DashboardData {
  healthScore: number;
  healthScoreTrend: number;
  kpis: {
    total: number;
    onTrack: number;
    atRisk: number;
    critical: number;
  };
  plans: {
    active: number;
    completed: number;
    overdue: number;
  };
  perspectives: {
    name: string;
    icon: string;
    progress: number;
    color: 'green' | 'blue' | 'yellow' | 'purple' | 'orange';
  }[];
  alerts: {
    id: string;
    type: 'danger' | 'warning' | 'info';
    message: string;
    time: string;
  }[];
  aiInsight: string;
}

// ============================================
// DADOS MOCK (fallback)
// ============================================
const mockData: DashboardData = {
  healthScore: 78,
  healthScoreTrend: 5,
  kpis: {
    total: 16,
    onTrack: 12,
    atRisk: 3,
    critical: 1,
  },
  plans: {
    active: 8,
    completed: 24,
    overdue: 2,
  },
  perspectives: [
    { name: 'Financeira', icon: '💰', progress: 78, color: 'green' },
    { name: 'Clientes', icon: '👥', progress: 65, color: 'blue' },
    { name: 'Processos', icon: '⚙️', progress: 52, color: 'yellow' },
    { name: 'Aprendizado', icon: '📚', progress: 38, color: 'purple' },
  ],
  alerts: [
    { id: '1', type: 'danger', message: 'KPI "OTD" abaixo da meta crítica (78%)', time: 'há 2h' },
    { id: '2', type: 'warning', message: 'Plano de ação #123 vence amanhã', time: 'há 4h' },
    { id: '3', type: 'info', message: 'Meta Q1 2026 foi revisada', time: 'há 1d' },
  ],
  aiInsight: 'Baseado nos dados atuais, recomendo priorizar o KPI de OTD que está 15% abaixo da meta. Ações sugeridas: revisar rota Sul e contratar transportadora backup para garantir entregas no prazo.',
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function StrategicDashboardShowcasePage() {
  const [data, setData] = useState<DashboardData>(mockData);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const result = await fetchAPI<{ healthScore?: number; previousHealthScore?: number; auroraInsight?: string }>('/api/strategic/dashboard/data', {
        signal: controller.signal,
      });
      
      // Mapear dados da API para o formato do dashboard
      if (isMountedRef.current && result.healthScore !== undefined) {
        setData(prev => ({
          ...prev,
          healthScore: result.healthScore ?? prev.healthScore,
          healthScoreTrend: typeof result.previousHealthScore === 'number'
            ? (result.healthScore ?? 0) - result.previousHealthScore 
            : prev.healthScoreTrend,
          aiInsight: result.auroraInsight ?? prev.aiInsight,
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-4 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard Estratégico</h1>
            </div>
            <p className="text-white/50 mt-1 text-sm lg:text-base">
              Visão consolidada da performance organizacional
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <Link
              href="/strategic/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-colors"
            >
              <Settings size={16} />
              Personalizar
            </Link>
          </div>
        </motion.div>

        {/* Health Score Hero */}
        <div className="mb-8">
          <HealthScoreCard 
            score={data.healthScore} 
            trend={data.healthScoreTrend} 
          />
        </div>

        {/* KPIs Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-400" />
              Indicadores (KPIs)
            </h2>
            <Link 
              href="/strategic/kpis" 
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<BarChart3 size={22} className="text-purple-400" />}
              iconBg="bg-purple-500/20"
              label="Total"
              value={data.kpis.total}
              badge="Total"
              badgeColor="bg-purple-500/20 text-purple-400"
              subtitle="indicadores"
              href="/strategic/kpis"
              delay={0.1}
            />
            <MetricCard
              icon={<CheckCircle2 size={22} className="text-green-400" />}
              iconBg="bg-green-500/20"
              label="No Prazo"
              value={data.kpis.onTrack}
              badge={`${Math.round((data.kpis.onTrack / data.kpis.total) * 100)}%`}
              badgeColor="bg-green-500/20 text-green-400"
              subtitle="dentro da meta"
              href="/strategic/kpis?status=on-track"
              delay={0.15}
            />
            <MetricCard
              icon={<Clock size={22} className="text-yellow-400" />}
              iconBg="bg-yellow-500/20"
              label="Em Risco"
              value={data.kpis.atRisk}
              badge="Atenção"
              badgeColor="bg-yellow-500/20 text-yellow-400"
              subtitle="precisam atenção"
              href="/strategic/kpis?status=at-risk"
              delay={0.2}
            />
            <MetricCard
              icon={<AlertTriangle size={22} className="text-red-400" />}
              iconBg="bg-red-500/20"
              label="Críticos"
              value={data.kpis.critical}
              badge="Urgente"
              badgeColor="bg-red-500/20 text-red-400"
              subtitle="ação imediata"
              href="/strategic/kpis?status=critical"
              isUrgent={data.kpis.critical > 0}
              delay={0.25}
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left - Perspectives */}
          <PerspectivesCard perspectives={data.perspectives} />
          
          {/* Center - Plans */}
          <PlansCard plans={data.plans} />
          
          {/* Right - Quick Actions + Alerts */}
          <div className="space-y-6">
            <QuickActionsCard />
            <AlertsCard alerts={data.alerts} />
          </div>
        </div>

        {/* AI Insights */}
        <AIInsightsCard 
          insight={data.aiInsight}
          onAnalyze={() => {
            const chatButton = document.querySelector('[data-aurora-chat]') as HTMLButtonElement;
            if (chatButton) chatButton.click();
          }}
          onReport={() => {
            window.location.href = '/strategic/reports';
          }}
        />

        {/* Footer spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
