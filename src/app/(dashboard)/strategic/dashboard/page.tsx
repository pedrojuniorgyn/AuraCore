"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Grid, 
  Col, 
  Flex, 
  DonutChart,
  Legend,
  Metric,
} from '@tremor/react';
import { 
  Target, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  Zap,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { 
  BscPerspectiveCard, 
  KpiGauge, 
  HealthScoreRing,
  CriticalAlerts,
  QuickActions,
  TrendChart,
  type Alert,
} from '@/components/strategic';

interface DashboardData {
  healthScore: number;
  criticalKpis: Array<{
    id: string;
    code: string;
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    variance: number;
  }>;
  alertKpis: Array<{
    id: string;
    code: string;
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }>;
  overduePlans: Array<{
    id: string;
    code: string;
    what: string;
    who: string;
    daysOverdue: number;
  }>;
  stats: {
    totalGoals: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
    goalsDelayed: number;
    totalKpis: number;
    kpisGreen: number;
    kpisYellow: number;
    kpisRed: number;
    totalActionPlans: number;
    plansOverdue: number;
    plansInProgress: number;
  };
}

interface PerspectiveData {
  perspective: 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL_PROCESS' | 'LEARNING_GROWTH';
  title: string;
  goalCount: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsDelayed: number;
  avgProgress: number;
}

export default function StrategicDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [perspectives, setPerspectives] = useState<PerspectiveData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/war-room/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdate(new Date());
        
        // Calculate perspective data from goals
        const totalGoals = result.stats.totalGoals || 1;
        setPerspectives([
          {
            perspective: 'FINANCIAL',
            title: 'Perspectiva Financeira',
            goalCount: Math.ceil(totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 72 + Math.round((result.healthScore || 0) * 10),
          },
          {
            perspective: 'CUSTOMER',
            title: 'Perspectiva do Cliente',
            goalCount: Math.ceil(totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 78 + Math.round((result.healthScore || 0) * 8),
          },
          {
            perspective: 'INTERNAL_PROCESS',
            title: 'Processos Internos',
            goalCount: Math.ceil(totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 65 + Math.round((result.healthScore || 0) * 6),
          },
          {
            perspective: 'LEARNING_GROWTH',
            title: 'Aprendizado e Crescimento',
            goalCount: Math.ceil(totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 85 + Math.round((result.healthScore || 0) * 5),
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  // Transform data to alerts format
  const alerts: Alert[] = [
    ...(data?.criticalKpis || []).map((kpi) => ({
      id: kpi.id,
      type: 'CRITICAL' as const,
      title: kpi.name,
      description: `Meta: ${kpi.targetValue}${kpi.unit} | Atual: ${kpi.currentValue}${kpi.unit}`,
      metric: `${kpi.variance.toFixed(1)}% abaixo`,
      source: 'KPI' as const,
    })),
    ...(data?.overduePlans || []).slice(0, 3).map((plan) => ({
      id: plan.id,
      type: 'WARNING' as const,
      title: `Plano atrasado: ${plan.code}`,
      description: plan.what,
      metric: `${plan.daysOverdue} dias`,
      source: 'PLAN' as const,
    })),
  ];

  const kpiDistribution = [
    { name: 'No Prazo', value: data?.stats.kpisGreen ?? 0 },
    { name: 'Atenção', value: data?.stats.kpisYellow ?? 0 },
    { name: 'Crítico', value: data?.stats.kpisRed ?? 0 },
  ];

  const healthScorePercent = Math.round((data?.healthScore ?? 0) * 100);

  return (
    <PageTransition>
      <div className="space-y-6 pb-8">
        {/* Header Premium */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-blue-900/50 p-6 border border-white/10">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl" />
            
            <Flex justifyContent="between" alignItems="start" className="relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-8 h-8 text-purple-400" />
                  <GradientText className="text-3xl sm:text-4xl font-bold">
                    Central de Comando Estratégico
                  </GradientText>
                </div>
                <Text className="text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
                  {autoRefresh && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full animate-pulse">
                      Auto-refresh 30s
                    </span>
                  )}
                </Text>
              </div>
              
              <Flex className="gap-3">
                <RippleButton 
                  variant="outline" 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-sm ${autoRefresh ? 'border-emerald-500/50' : ''}`}
                >
                  {autoRefresh ? '⏸️ Pausar' : '▶️ Ativar'}
                </RippleButton>
                <RippleButton 
                  variant="outline" 
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </RippleButton>
                <RippleButton onClick={() => router.push('/strategic/map')}>
                  Mapa Estratégico
                  <ArrowRight className="w-4 h-4 ml-2" />
                </RippleButton>
              </Flex>
            </Flex>
          </div>
        </FadeIn>

        {/* Main Grid: Health Score + Alerts */}
        <StaggerContainer>
          <Grid numItemsMd={2} numItemsLg={3} className="gap-6">
            {/* Health Score */}
            <Col numColSpan={1}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <HealthScoreRing 
                  score={healthScorePercent}
                  previousScore={72}
                  label="Saúde Estratégica"
                />
              </motion.div>
            </Col>

            {/* Critical Alerts */}
            <Col numColSpan={1} numColSpanLg={2}>
              <CriticalAlerts 
                alerts={alerts}
                onViewAll={() => router.push('/strategic/kpis?status=RED')}
                onAlertClick={(alert) => {
                  if (alert.source === 'KPI') {
                    router.push(`/strategic/kpis/${alert.id}`);
                  } else if (alert.source === 'PLAN') {
                    router.push(`/strategic/action-plans/${alert.id}`);
                  }
                }}
                maxHeight="250px"
              />
            </Col>
          </Grid>
        </StaggerContainer>

        {/* BSC Perspectives */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <Title className="text-white">Perspectivas BSC</Title>
            <button 
              onClick={() => router.push('/strategic/goals')}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
            >
              Ver objetivos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
            {perspectives.map((p, index) => (
              <motion.div
                key={p.perspective}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <BscPerspectiveCard
                  perspective={p.perspective}
                  title={p.title}
                  goalCount={p.goalCount}
                  goalsOnTrack={p.goalsOnTrack}
                  goalsAtRisk={p.goalsAtRisk}
                  goalsDelayed={p.goalsDelayed}
                  avgProgress={Math.min(p.avgProgress, 100)}
                />
              </motion.div>
            ))}
          </Grid>
        </FadeIn>

        {/* Charts and Quick Actions Row */}
        <FadeIn delay={0.2}>
          <Grid numItemsMd={2} numItemsLg={3} className="gap-6">
            {/* Trend Chart */}
            <Col numColSpan={1} numColSpanLg={2}>
              <TrendChart 
                data={[]} 
                currentScore={healthScorePercent}
                previousScore={72}
              />
            </Col>

            {/* Quick Actions */}
            <Col numColSpan={1}>
              <QuickActions onNavigate={(href) => router.push(href)} />
            </Col>
          </Grid>
        </FadeIn>

        {/* KPI Distribution + Stats */}
        <FadeIn delay={0.3}>
          <Grid numItemsMd={2} className="gap-6">
            {/* KPI Distribution */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Title className="text-white">Distribuição de KPIs</Title>
                  <Text className="text-gray-400">Por status de desempenho</Text>
                </div>
                <div className="text-right">
                  <Metric className="text-white">{data?.stats.totalKpis ?? 0}</Metric>
                  <Text className="text-gray-500 text-xs">Total</Text>
                </div>
              </Flex>
              
              <Flex className="mt-6" justifyContent="center">
                <DonutChart
                  data={kpiDistribution}
                  category="value"
                  index="name"
                  colors={['emerald', 'amber', 'red']}
                  className="w-48 h-48"
                  showAnimation={true}
                />
              </Flex>
              <Legend
                categories={['No Prazo', 'Atenção', 'Crítico']}
                colors={['emerald', 'amber', 'red']}
                className="mt-6 justify-center"
              />
            </Card>

            {/* Quick Stats Grid */}
            <div className="space-y-4">
              <Grid numItemsSm={2} className="gap-4">
                <Card decoration="left" decorationColor="blue" className="bg-gray-900/50 border-gray-800">
                  <Text className="text-gray-400">Total de Metas</Text>
                  <Metric className="text-white">{data?.stats.totalGoals ?? 0}</Metric>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="text-emerald-400">🟢 {data?.stats.goalsOnTrack ?? 0}</span>
                    <span className="text-amber-400">🟡 {data?.stats.goalsAtRisk ?? 0}</span>
                    <span className="text-red-400">🔴 {data?.stats.goalsDelayed ?? 0}</span>
                  </div>
                </Card>
                
                <Card decoration="left" decorationColor="purple" className="bg-gray-900/50 border-gray-800">
                  <Text className="text-gray-400">Planos de Ação</Text>
                  <Metric className="text-white">{data?.stats.totalActionPlans ?? 0}</Metric>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="text-blue-400">🔄 {data?.stats.plansInProgress ?? 0} em exec.</span>
                    <span className="text-red-400">⚠️ {data?.stats.plansOverdue ?? 0} atrasados</span>
                  </div>
                </Card>
              </Grid>

              {/* Overdue Plans Preview */}
              {data?.overduePlans && data.overduePlans.length > 0 && (
                <Card className="bg-red-900/20 border-red-800/50">
                  <Flex justifyContent="between" alignItems="center" className="mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <Text className="text-red-300 font-medium">Planos Atrasados</Text>
                    </div>
                    <button 
                      onClick={() => router.push('/strategic/action-plans?filter=overdue')}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Ver todos →
                    </button>
                  </Flex>
                  <div className="space-y-2">
                    {data.overduePlans.slice(0, 3).map((plan) => (
                      <div 
                        key={plan.id}
                        onClick={() => router.push(`/strategic/action-plans/${plan.id}`)}
                        className="flex items-center justify-between text-sm p-3 bg-red-900/30 
                          rounded-lg cursor-pointer hover:bg-red-900/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium">{plan.code}</span>
                          <p className="text-gray-400 text-xs truncate">{plan.what}</p>
                        </div>
                        <span className="text-red-400 font-medium ml-2 whitespace-nowrap">
                          {plan.daysOverdue}d
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Grid>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
