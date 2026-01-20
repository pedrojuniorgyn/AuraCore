"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Select,
  SelectItem,
  Badge,
} from '@tremor/react';
import { 
  Map,
  RefreshCw,
  Filter,
  Download,
  ZoomIn,
  ArrowLeft,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { StrategicMap } from '@/components/strategic/StrategicMap';

interface Goal {
  id: string;
  code: string;
  description: string;
  perspectiveId: string;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'NOT_STARTED' | 'COMPLETED';
  targetValue: number;
  currentValue: number;
  unit: string;
  parentGoalId: string | null;
  ownerUserId: string;
}

interface GoalWithKpiCount extends Goal {
  kpiCount: number;
  ownerName?: string;
}

export default function StrategicMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GoalWithKpiCount[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [perspectiveFilter, setPerspectiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/goals?pageSize=100');
      if (response.ok) {
        const result = await response.json();
        
        // Transform API response to map format
        const goalsWithCount: GoalWithKpiCount[] = result.items.map((goal: Record<string, unknown>) => ({
          id: goal.id as string,
          code: goal.code as string,
          description: goal.description as string,
          perspectiveId: goal.perspectiveId as string,
          progress: (goal.progress as number) ?? ((goal.currentValue as number) / (goal.targetValue as number || 1)) * 100,
          status: mapStatus(goal.status as string),
          targetValue: goal.targetValue as number,
          currentValue: goal.currentValue as number,
          unit: goal.unit as string,
          parentGoalId: (goal.parentGoalId as string) ?? null,
          ownerUserId: goal.ownerUserId as string,
          kpiCount: 3, // TODO: Fetch real KPI count
          ownerName: 'Responsável', // TODO: Fetch owner name
        }));

        setGoals(goalsWithCount);
      }
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (status: string): GoalWithKpiCount['status'] => {
    const statusMap: Record<string, GoalWithKpiCount['status']> = {
      'ON_TRACK': 'ON_TRACK',
      'AT_RISK': 'AT_RISK',
      'DELAYED': 'DELAYED',
      'NOT_STARTED': 'NOT_STARTED',
      'COMPLETED': 'COMPLETED',
    };
    return statusMap[status] || 'NOT_STARTED';
  };

  const handleGoalClick = useCallback((goalId: string) => {
    router.push(`/strategic/goals/${goalId}`);
  }, [router]);

  const filteredGoals = goals.filter((goal) => {
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (perspectiveFilter !== 'all' && !goal.perspectiveId.includes(perspectiveFilter)) return false;
    return true;
  });

  const statusCounts = {
    onTrack: goals.filter(g => g.status === 'ON_TRACK').length,
    atRisk: goals.filter(g => g.status === 'AT_RISK').length,
    delayed: goals.filter(g => g.status === 'DELAYED').length,
    completed: goals.filter(g => g.status === 'COMPLETED').length,
  };

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
                  Mapa Estratégico
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Visualização interativa dos objetivos BSC
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={fetchGoals}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {/* Status Summary */}
        <FadeIn delay={0.1}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Flex justifyContent="between" alignItems="center">
              <Flex className="gap-4">
                <Badge color="emerald" size="lg">
                  {statusCounts.onTrack} No Prazo
                </Badge>
                <Badge color="amber" size="lg">
                  {statusCounts.atRisk} Em Risco
                </Badge>
                <Badge color="red" size="lg">
                  {statusCounts.delayed} Atrasados
                </Badge>
                <Badge color="blue" size="lg">
                  {statusCounts.completed} Concluídos
                </Badge>
              </Flex>

              <Flex className="gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  className="w-40"
                  placeholder="Status"
                >
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="ON_TRACK">No Prazo</SelectItem>
                  <SelectItem value="AT_RISK">Em Risco</SelectItem>
                  <SelectItem value="DELAYED">Atrasados</SelectItem>
                  <SelectItem value="COMPLETED">Concluídos</SelectItem>
                </Select>

                <Select
                  value={perspectiveFilter}
                  onValueChange={setPerspectiveFilter}
                  className="w-48"
                  placeholder="Perspectiva"
                >
                  <SelectItem value="all">Todas Perspectivas</SelectItem>
                  <SelectItem value="financ">Financeira</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="process">Processos</SelectItem>
                  <SelectItem value="learn">Aprendizado</SelectItem>
                </Select>
              </Flex>
            </Flex>
          </Card>
        </FadeIn>

        {/* Strategic Map */}
        <FadeIn delay={0.2}>
          <Card className="bg-gray-900/50 border-gray-800 p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Title className="text-white">
                    <Map className="w-5 h-5 inline mr-2" />
                    Mapa de Objetivos
                  </Title>
                  <Text className="text-gray-400">
                    Clique em um objetivo para ver detalhes. Arraste para reorganizar.
                  </Text>
                </div>
                <Text className="text-gray-500">
                  {filteredGoals.length} objetivo(s) exibido(s)
                </Text>
              </Flex>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                  <Text className="text-gray-400">Carregando mapa estratégico...</Text>
                </div>
              </div>
            ) : filteredGoals.length > 0 ? (
              <StrategicMap 
                goals={filteredGoals} 
                onGoalClick={handleGoalClick}
              />
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <Map className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <Title className="text-gray-400">Nenhum objetivo encontrado</Title>
                  <Text className="text-gray-500 mt-2">
                    Crie objetivos estratégicos para visualizá-los no mapa.
                  </Text>
                  <RippleButton 
                    className="mt-4"
                    onClick={() => router.push('/strategic/goals')}
                  >
                    Gerenciar Objetivos
                  </RippleButton>
                </div>
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Legend */}
        <FadeIn delay={0.3}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Title className="text-white text-sm mb-3">Legenda</Title>
            <Flex className="gap-6">
              <Flex className="gap-2" alignItems="center">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <Text className="text-gray-400 text-sm">No Prazo (80%+)</Text>
              </Flex>
              <Flex className="gap-2" alignItems="center">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <Text className="text-gray-400 text-sm">Em Risco (50-79%)</Text>
              </Flex>
              <Flex className="gap-2" alignItems="center">
                <div className="w-4 h-4 rounded bg-red-500" />
                <Text className="text-gray-400 text-sm">Atrasado (&lt;50%)</Text>
              </Flex>
              <Flex className="gap-2" alignItems="center">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <Text className="text-gray-400 text-sm">Concluído</Text>
              </Flex>
              <Flex className="gap-2" alignItems="center">
                <div className="w-4 h-4 rounded bg-gray-500" />
                <Text className="text-gray-400 text-sm">Não Iniciado</Text>
              </Flex>
            </Flex>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
