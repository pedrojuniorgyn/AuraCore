"use client";

/**
 * Página: War Room Dashboard
 * Visão executiva consolidada para tomada de decisões estratégicas
 * 
 * @module app/(dashboard)/strategic/war-room
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
  Metric,
  ProgressBar,
  AreaChart,
  DonutChart,
} from '@tremor/react';
import { 
  RefreshCw,
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { HealthScoreRing } from '@/components/strategic/HealthScoreRing';

interface CriticalKpi {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  variance: number;
}

interface OverduePlan {
  id: string;
  code: string;
  what: string;
  who: string;
  daysOverdue: number;
}

interface DashboardStats {
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
}

interface WarRoomData {
  updatedAt: string;
  healthScore: number;
  criticalKpis: CriticalKpi[];
  alertKpis: CriticalKpi[];
  overduePlans: OverduePlan[];
  stats: DashboardStats;
}

// Safelist pattern
const HEALTH_STATUS = {
  EXCELLENT: { label: 'Excelente', color: 'text-emerald-400', threshold: 0.8 },
  GOOD: { label: 'Bom', color: 'text-blue-400', threshold: 0.6 },
  ATTENTION: { label: 'Atenção', color: 'text-amber-400', threshold: 0.4 },
  CRITICAL: { label: 'Crítico', color: 'text-red-400', threshold: 0 },
} as const;

function getHealthStatus(score: number) {
  if (score >= 0.8) return HEALTH_STATUS.EXCELLENT;
  if (score >= 0.6) return HEALTH_STATUS.GOOD;
  if (score >= 0.4) return HEALTH_STATUS.ATTENTION;
  return HEALTH_STATUS.CRITICAL;
}

export default function WarRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WarRoomData | null>(null);

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
      }
    } catch (error) {
      console.error('Erro ao carregar War Room:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthStatus = data ? getHealthStatus(data.healthScore) : null;

  // Dados para gráfico de KPIs
  const kpiDonutData = data ? [
    { name: 'Verde', value: data.stats.kpisGreen },
    { name: 'Amarelo', value: data.stats.kpisYellow },
    { name: 'Vermelho', value: data.stats.kpisRed },
  ] : [];

  // Dados para gráfico de Objetivos
  const goalDonutData = data ? [
    { name: 'No Prazo', value: data.stats.goalsOnTrack },
    { name: 'Em Risco', value: data.stats.goalsAtRisk },
    { name: 'Atrasados', value: data.stats.goalsDelayed },
  ] : [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-4xl font-bold">
                  War Room
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Central de comando estratégico - Visão executiva consolidada
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline"
                onClick={() => router.push('/strategic/war-room/meetings')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Reuniões
              </RippleButton>
              <RippleButton 
                variant="outline" 
                onClick={fetchDashboardData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
              <Text className="text-gray-400">Carregando War Room...</Text>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Health Score Section */}
            <FadeIn delay={0.1}>
              <Card className="bg-gray-900/50 border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Health Score Ring */}
                  <div className="flex flex-col items-center justify-center">
                    <HealthScoreRing 
                      score={Math.round(data.healthScore * 100)} 
                      size="lg"
                    />
                    <div className="mt-4 text-center">
                      <Text className={`text-lg font-semibold ${healthStatus?.color}`}>
                        {healthStatus?.label}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        Saúde Estratégica
                      </Text>
                    </div>
                  </div>

                  {/* KPIs Chart */}
                  <div>
                    <Title className="text-white text-sm mb-2">KPIs por Status</Title>
                    <DonutChart
                      data={kpiDonutData}
                      category="value"
                      index="name"
                      colors={['emerald', 'amber', 'red']}
                      className="h-40"
                      showAnimation
                    />
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                      <span className="text-emerald-400">{data.stats.kpisGreen} Verde</span>
                      <span className="text-amber-400">{data.stats.kpisYellow} Amarelo</span>
                      <span className="text-red-400">{data.stats.kpisRed} Vermelho</span>
                    </div>
                  </div>

                  {/* Goals Chart */}
                  <div>
                    <Title className="text-white text-sm mb-2">Objetivos por Status</Title>
                    <DonutChart
                      data={goalDonutData}
                      category="value"
                      index="name"
                      colors={['emerald', 'amber', 'red']}
                      className="h-40"
                      showAnimation
                    />
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                      <span className="text-emerald-400">{data.stats.goalsOnTrack} Prazo</span>
                      <span className="text-amber-400">{data.stats.goalsAtRisk} Risco</span>
                      <span className="text-red-400">{data.stats.goalsDelayed} Atraso</span>
                    </div>
                  </div>
                </div>
              </Card>
            </FadeIn>

            {/* Stats Overview */}
            <FadeIn delay={0.15}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex alignItems="center" className="gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <Text className="text-gray-400">Objetivos</Text>
                      <Metric className="text-white">{data.stats.totalGoals}</Metric>
                    </div>
                  </Flex>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex alignItems="center" className="gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Activity className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <Text className="text-gray-400">KPIs</Text>
                      <Metric className="text-white">{data.stats.totalKpis}</Metric>
                    </div>
                  </Flex>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex alignItems="center" className="gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <Text className="text-gray-400">Planos Ativos</Text>
                      <Metric className="text-white">{data.stats.totalActionPlans}</Metric>
                    </div>
                  </Flex>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex alignItems="center" className="gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <Text className="text-gray-400">Atrasados</Text>
                      <Metric className="text-red-400">{data.stats.plansOverdue}</Metric>
                    </div>
                  </Flex>
                </Card>
              </div>
            </FadeIn>

            {/* Alerts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Critical KPIs */}
              <FadeIn delay={0.2}>
                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex justifyContent="between" alignItems="center" className="mb-4">
                    <div>
                      <Title className="text-white">KPIs Críticos</Title>
                      <Text className="text-gray-400 text-sm">
                        Indicadores abaixo da meta
                      </Text>
                    </div>
                    <Badge color="red" size="lg">
                      {data.criticalKpis.length}
                    </Badge>
                  </Flex>

                  <div className="space-y-3">
                    {data.criticalKpis.length > 0 ? (
                      data.criticalKpis.map((kpi) => (
                        <div
                          key={kpi.id}
                          className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg"
                        >
                          <Flex justifyContent="between" alignItems="start">
                            <div>
                              <Text className="text-white font-medium">{kpi.name}</Text>
                              <Text className="text-gray-400 text-xs">{kpi.code}</Text>
                            </div>
                            <div className="text-right">
                              <Text className="text-red-400 font-semibold">
                                {kpi.currentValue} {kpi.unit}
                              </Text>
                              <Text className="text-gray-500 text-xs">
                                Meta: {kpi.targetValue} {kpi.unit}
                              </Text>
                            </div>
                          </Flex>
                          <div className="mt-2 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <Text className="text-red-400 text-sm">
                              {Math.abs(kpi.variance).toFixed(1)}% abaixo
                            </Text>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                        <Text className="text-gray-400">
                          Nenhum KPI crítico
                        </Text>
                      </div>
                    )}
                  </div>
                </Card>
              </FadeIn>

              {/* Overdue Plans */}
              <FadeIn delay={0.25}>
                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex justifyContent="between" alignItems="center" className="mb-4">
                    <div>
                      <Title className="text-white">Ações Atrasadas</Title>
                      <Text className="text-gray-400 text-sm">
                        Planos de ação vencidos
                      </Text>
                    </div>
                    <Badge color="amber" size="lg">
                      {data.overduePlans.length}
                    </Badge>
                  </Flex>

                  <div className="space-y-3">
                    {data.overduePlans.length > 0 ? (
                      data.overduePlans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => router.push(`/strategic/action-plans/${plan.id}`)}
                          className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg cursor-pointer hover:bg-amber-900/30 transition-colors"
                        >
                          <Flex justifyContent="between" alignItems="start">
                            <div className="flex-1">
                              <Text className="text-white font-medium">{plan.code}</Text>
                              <Text className="text-gray-400 text-sm line-clamp-1">
                                {plan.what}
                              </Text>
                            </div>
                            <Badge color="red">
                              {plan.daysOverdue}d
                            </Badge>
                          </Flex>
                          <div className="mt-2 flex items-center gap-2">
                            <Users className="w-3 h-3 text-gray-500" />
                            <Text className="text-gray-500 text-xs">{plan.who}</Text>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                        <Text className="text-gray-400">
                          Nenhuma ação atrasada
                        </Text>
                      </div>
                    )}
                  </div>
                </Card>
              </FadeIn>
            </div>

            {/* Updated At */}
            <FadeIn delay={0.3}>
              <div className="text-center">
                <Text className="text-gray-500 text-xs">
                  Atualizado em: {new Date(data.updatedAt).toLocaleString('pt-BR')}
                </Text>
              </div>
            </FadeIn>
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
