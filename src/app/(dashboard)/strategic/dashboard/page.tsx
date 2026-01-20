"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Grid, 
  Col, 
  Flex, 
  AreaChart,
  BarList,
  DonutChart,
  Legend,
  Metric,
} from '@tremor/react';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { BscPerspectiveCard } from '@/components/strategic/BscPerspectiveCard';
import { KpiGauge } from '@/components/strategic/KpiGauge';
import { HealthScoreRing } from '@/components/strategic/HealthScoreRing';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/war-room/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        
        // Calculate perspective data from goals (mock for now)
        setPerspectives([
          {
            perspective: 'FINANCIAL',
            title: 'Perspectiva Financeira',
            goalCount: Math.ceil(result.stats.totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 72,
          },
          {
            perspective: 'CUSTOMER',
            title: 'Perspectiva do Cliente',
            goalCount: Math.ceil(result.stats.totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 68,
          },
          {
            perspective: 'INTERNAL_PROCESS',
            title: 'Processos Internos',
            goalCount: Math.ceil(result.stats.totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 81,
          },
          {
            perspective: 'LEARNING_GROWTH',
            title: 'Aprendizado e Crescimento',
            goalCount: Math.ceil(result.stats.totalGoals * 0.25),
            goalsOnTrack: Math.ceil(result.stats.goalsOnTrack * 0.25),
            goalsAtRisk: Math.ceil(result.stats.goalsAtRisk * 0.25),
            goalsDelayed: Math.ceil(result.stats.goalsDelayed * 0.25),
            avgProgress: 65,
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiDistribution = [
    { name: 'No Prazo', value: data?.stats.kpisGreen ?? 0 },
    { name: 'Atenção', value: data?.stats.kpisYellow ?? 0 },
    { name: 'Crítico', value: data?.stats.kpisRed ?? 0 },
  ];

  const actionsBarData = [
    { name: 'Em Progresso', value: data?.stats.plansInProgress ?? 0 },
    { name: 'Atrasadas', value: data?.stats.plansOverdue ?? 0 },
    { name: 'Total Ativas', value: data?.stats.totalActionPlans ?? 0 },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                Dashboard Estratégico
              </GradientText>
              <Text className="text-gray-400">
                Balanced Scorecard - Visão Executiva
              </Text>
            </div>
            <Flex className="gap-3">
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
        </FadeIn>

        {/* Health Score + KPIs Críticos */}
        <StaggerContainer>
          <Grid numItemsMd={2} numItemsLg={3} className="gap-6">
            <Col numColSpan={1}>
              <HealthScoreRing 
                score={(data?.healthScore ?? 0) * 100}
                previousScore={72}
                label="Saúde Estratégica"
              />
            </Col>

            <Col numColSpan={1} numColSpanLg={2}>
              <GlassmorphismCard className="h-full">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <div>
                    <Title className="text-white">KPIs Críticos</Title>
                    <Text className="text-gray-400">Requerem atenção imediata</Text>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </Flex>

                {data?.criticalKpis && data.criticalKpis.length > 0 ? (
                  <Grid numItemsSm={2} numItemsLg={3} className="gap-4">
                    {data.criticalKpis.slice(0, 6).map((kpi) => (
                      <KpiGauge
                        key={kpi.id}
                        id={kpi.id}
                        code={kpi.code}
                        name={kpi.name}
                        currentValue={kpi.currentValue}
                        targetValue={kpi.targetValue}
                        unit="%"
                        status="RED"
                        deviationPercent={kpi.variance}
                        onClick={(id) => router.push(`/strategic/kpis/${id}`)}
                      />
                    ))}
                  </Grid>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-500">
                    <Target className="w-8 h-8 mr-2" />
                    Nenhum KPI crítico
                  </div>
                )}
              </GlassmorphismCard>
            </Col>
          </Grid>
        </StaggerContainer>

        {/* BSC Perspectives */}
        <FadeIn delay={0.1}>
          <Title className="text-white mb-4">Perspectivas BSC</Title>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
            {perspectives.map((p) => (
              <BscPerspectiveCard
                key={p.perspective}
                perspective={p.perspective}
                title={p.title}
                goalCount={p.goalCount}
                goalsOnTrack={p.goalsOnTrack}
                goalsAtRisk={p.goalsAtRisk}
                goalsDelayed={p.goalsDelayed}
                avgProgress={p.avgProgress}
              />
            ))}
          </Grid>
        </FadeIn>

        {/* Charts Row */}
        <FadeIn delay={0.2}>
          <Grid numItemsMd={2} className="gap-6">
            {/* KPI Distribution */}
            <Card className="bg-gray-900/50 border-gray-800">
              <Title className="text-white">Distribuição de KPIs</Title>
              <Text className="text-gray-400">Por status de desempenho</Text>
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

            {/* Action Plans */}
            <Card className="bg-gray-900/50 border-gray-800">
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Title className="text-white">Planos de Ação</Title>
                  <Text className="text-gray-400">Status atual</Text>
                </div>
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/action-plans')}
                >
                  Ver todos
                  <ArrowRight className="w-4 h-4 ml-1" />
                </RippleButton>
              </Flex>
              <BarList 
                data={actionsBarData} 
                className="mt-6"
                color="purple"
              />

              {data?.overduePlans && data.overduePlans.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <Text className="text-red-400 text-sm mb-3">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    {data.overduePlans.length} plano(s) atrasado(s)
                  </Text>
                  <div className="space-y-2">
                    {data.overduePlans.slice(0, 3).map((plan) => (
                      <div 
                        key={plan.id}
                        className="flex items-center justify-between text-sm p-2 bg-red-900/20 rounded-lg"
                      >
                        <span className="text-gray-300 truncate max-w-[200px]">
                          {plan.what}
                        </span>
                        <span className="text-red-400">
                          {plan.daysOverdue}d atraso
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Grid>
        </FadeIn>

        {/* Quick Stats */}
        <FadeIn delay={0.3}>
          <Grid numItemsSm={2} numItemsMd={4} className="gap-4">
            <Card decoration="top" decorationColor="blue" className="bg-gray-900/50 border-gray-800">
              <Text className="text-gray-400">Total de Metas</Text>
              <Metric className="text-white">{data?.stats.totalGoals ?? 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald" className="bg-gray-900/50 border-gray-800">
              <Text className="text-gray-400">KPIs Monitorados</Text>
              <Metric className="text-white">{data?.stats.totalKpis ?? 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="amber" className="bg-gray-900/50 border-gray-800">
              <Text className="text-gray-400">Ações em Execução</Text>
              <Metric className="text-white">{data?.stats.plansInProgress ?? 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="purple" className="bg-gray-900/50 border-gray-800">
              <Text className="text-gray-400">Planos Ativos</Text>
              <Metric className="text-white">{data?.stats.totalActionPlans ?? 0}</Metric>
            </Card>
          </Grid>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
