"use client";

/**
 * Página: Indicadores (KPIs)
 * Dashboard premium com gauges e sparklines
 * 
 * @module app/(dashboard)/strategic/kpis
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  BarChart3, 
  Plus, 
  Search, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Download,
} from 'lucide-react';
import { KpiCard, type KpiData } from '@/components/strategic/KpiCard';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { StaggerContainer } from '@/components/ui/animated-wrappers';

type KpiStatus = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_DATA';
type Perspective = 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL' | 'LEARNING';

const PERSPECTIVE_CONFIG: Record<Perspective, { icon: string; label: string; color: string }> = {
  FINANCIAL: { icon: '💰', label: 'Financeira', color: 'green' },
  CUSTOMER: { icon: '👥', label: 'Cliente', color: 'blue' },
  INTERNAL: { icon: '⚙️', label: 'Processos Internos', color: 'purple' },
  LEARNING: { icon: '📚', label: 'Aprendizado e Crescimento', color: 'orange' },
};

// Converter status antigo (GREEN/YELLOW/RED) para novo (ON_TRACK/AT_RISK/CRITICAL)
function normalizeStatus(status: string): KpiStatus {
  const mapping: Record<string, KpiStatus> = {
    'GREEN': 'ON_TRACK',
    'YELLOW': 'AT_RISK',
    'RED': 'CRITICAL',
    'GRAY': 'NO_DATA',
    'ON_TRACK': 'ON_TRACK',
    'AT_RISK': 'AT_RISK',
    'CRITICAL': 'CRITICAL',
    'NO_DATA': 'NO_DATA',
  };
  return mapping[status] || 'NO_DATA';
}

export default function KpisPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);

  const fetchKpis = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/api/strategic/kpis?pageSize=100');
      if (response.ok) {
        const result = await response.json();
        // Normalizar dados da API
        const normalizedKpis: KpiData[] = (result.items || result.kpis || []).map((kpi: Record<string, unknown>) => ({
          id: kpi.id as string,
          code: kpi.code as string || `KPI-${String(kpi.id).slice(0, 4)}`,
          name: kpi.name as string || kpi.description as string,
          currentValue: Number(kpi.currentValue) || 0,
          targetValue: Number(kpi.targetValue) || 100,
          unit: kpi.unit as string || '%',
          status: normalizeStatus(kpi.status as string),
          trend: Number(kpi.trend) || 0,
          history: (kpi.history as number[]) || generateMockHistory(),
          variance: Number(kpi.variance) || Number(kpi.deviationPercent) || 0,
          perspective: kpi.perspective as string || 'INTERNAL',
        }));
        setKpis(normalizedKpis);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Summary calculations
  const summary = useMemo(() => ({
    total: kpis.length,
    onTrack: kpis.filter(k => k.status === 'ON_TRACK').length,
    atRisk: kpis.filter(k => k.status === 'AT_RISK').length,
    critical: kpis.filter(k => k.status === 'CRITICAL').length,
    noData: kpis.filter(k => k.status === 'NO_DATA').length,
  }), [kpis]);

  // Filter KPIs
  const filteredKpis = useMemo(() => {
    return kpis.filter(kpi => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          kpi.name.toLowerCase().includes(searchLower) ||
          kpi.code.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (statusFilter && kpi.status !== statusFilter) return false;
      if (perspectiveFilter && kpi.perspective !== perspectiveFilter) return false;
      return true;
    });
  }, [kpis, search, statusFilter, perspectiveFilter]);

  // Group by perspective
  const grouped = useMemo(() => {
    const g: Record<string, KpiData[]> = {};
    filteredKpis.forEach(kpi => {
      const perspective = kpi.perspective || 'INTERNAL';
      if (!g[perspective]) g[perspective] = [];
      g[perspective].push(kpi);
    });
    return g;
  }, [filteredKpis]);

  const handleKpiClick = (id: string) => {
    router.push(`/strategic/kpis/${id}`);
  };

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      {/* Header */}
      <PageHeader
        icon="📊"
        title="Indicadores (KPIs)"
        description="Acompanhe o desempenho dos indicadores estratégicos"
        recordCount={kpis.length}
        onRefresh={() => fetchKpis(true)}
        isLoading={refreshing}
        actions={
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar KPI..."
                className="pl-10 pr-4 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white placeholder-white/40 w-[200px]
                  focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Perspective Filter */}
            <select
              value={perspectiveFilter || ''}
              onChange={(e) => setPerspectiveFilter(e.target.value || null)}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              <option value="">Todas Perspectivas</option>
              {Object.entries(PERSPECTIVE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>

            <RippleButton
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </RippleButton>
            
            <Link href="/strategic/kpis/new">
              <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                <Plus className="w-4 h-4 mr-2" />
                Novo KPI
              </RippleButton>
            </Link>
          </>
        }
      />

      {/* Summary Cards - Padrão Enterprise */}
      <StaggerContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <EnterpriseMetricCard
            icon={<BarChart3 className="h-6 w-6 text-purple-400" />}
            badge="Total"
            title="Total de KPIs"
            value={summary.total}
            subtitle="indicadores cadastrados"
            variant="purple"
            delay={0.2}
            onClick={() => setStatusFilter(null)}
          />
          <EnterpriseMetricCard
            icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
            badge="No Prazo"
            badgeEmoji="✅"
            title="No Prazo"
            value={summary.onTrack}
            subtitle={`${Math.round((summary.onTrack / Math.max(summary.total, 1)) * 100)}% do total`}
            variant="green"
            delay={0.3}
            onClick={() => setStatusFilter(statusFilter === 'ON_TRACK' ? null : 'ON_TRACK')}
          />
          <EnterpriseMetricCard
            icon={<Clock className="h-6 w-6 text-amber-400" />}
            badge="Em Risco"
            badgeEmoji="⚠️"
            title="Em Risco"
            value={summary.atRisk}
            subtitle="necessitam atenção"
            variant="yellow"
            delay={0.4}
            onClick={() => setStatusFilter(statusFilter === 'AT_RISK' ? null : 'AT_RISK')}
          />
          <EnterpriseMetricCard
            icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
            badge="Crítico"
            badgeEmoji="❌"
            title="Críticos"
            value={summary.critical}
            subtitle="ação imediata"
            variant="red"
            delay={0.5}
            isUrgent={summary.critical > 0}
            onClick={() => setStatusFilter(statusFilter === 'CRITICAL' ? null : 'CRITICAL')}
          />
          <EnterpriseMetricCard
            icon={<HelpCircle className="h-6 w-6 text-gray-400" />}
            badge="Sem Dados"
            title="Sem Dados"
            value={summary.noData}
            subtitle="aguardando medição"
            variant="blue"
            delay={0.6}
            onClick={() => setStatusFilter(statusFilter === 'NO_DATA' ? null : 'NO_DATA')}
          />
        </div>
      </StaggerContainer>

      {/* KPIs by Perspective */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">Carregando indicadores...</p>
          </div>
        </div>
      ) : filteredKpis.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <EmptyState
            icon={<BarChart3 className="w-8 h-8 text-white/30" />}
            title="Nenhum KPI encontrado"
            description={
              (search || statusFilter || perspectiveFilter)
                ? "Tente ajustar os filtros de busca"
                : "Crie seu primeiro indicador para começar"
            }
            actionLabel={(search || statusFilter || perspectiveFilter) ? undefined : "Criar KPI"}
            actionHref="/strategic/kpis/new"
          />
          {(search || statusFilter || perspectiveFilter) && (
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter(null);
                  setPerspectiveFilter(null);
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(PERSPECTIVE_CONFIG) as Perspective[]).map((perspective) => {
            const perspectiveKpis = grouped[perspective];
            if (!perspectiveKpis || perspectiveKpis.length === 0) return null;

            const config = PERSPECTIVE_CONFIG[perspective];

            return (
              <motion.div
                key={perspective}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">{config.icon}</span>
                  {config.label}
                  <span className="text-white/40 text-sm font-normal ml-2">
                    ({perspectiveKpis.length} {perspectiveKpis.length === 1 ? 'indicador' : 'indicadores'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {perspectiveKpis.map((kpi, index) => (
                    <motion.div
                      key={kpi.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <KpiCard kpi={kpi} onClick={handleKpiClick} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper para gerar histórico mock se não existir
function generateMockHistory(): number[] {
  const history: number[] = [];
  let value = 50 + Math.random() * 30;
  for (let i = 0; i < 7; i++) {
    value = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 10));
    history.push(Math.round(value));
  }
  return history;
}
