"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  Plus,
  Info,
} from 'lucide-react';

import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { StrategicMap } from '@/components/strategic/StrategicMap';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

// Tipos que correspondem à resposta da API /api/strategic/map
interface MapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    code: string;
    description: string;
    perspectiveCode: string; // FIN, CLI, INT, LRN
    cascadeLevel: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    status: string;
    statusColor: string;
    progress: number;
    color: string;
    ownerUserId: string;
  };
}

interface MapEdge {
  id: string;
  source: string;
  target: string;
}

interface MapApiResponse {
  strategyId?: string;
  strategyName?: string;
  nodes: MapNode[];
  edges: MapEdge[];
  perspectives: Array<{
    code: string;
    name: string;
    color: string;
    y: number;
  }>;
  summary?: {
    totalGoals: number;
    byStatus: Record<string, number>;
  };
}

// Formato para o componente StrategicMap
interface GoalForMap {
  id: string;
  code: string;
  description: string;
  perspectiveId: string; // Código da perspectiva (FIN, CLI, INT, LRN)
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'NOT_STARTED' | 'COMPLETED';
  targetValue: number;
  currentValue: number;
  unit: string;
  parentGoalId: string | null;
  kpiCount: number;
  ownerName?: string;
}

// Mapeamento de filtro para código de perspectiva
const PERSPECTIVE_FILTER_TO_CODE = {
  FIN: 'FIN',
  CLI: 'CLI',
  INT: 'INT',
  LRN: 'LRN',
} as const;

type PerspectiveCode = keyof typeof PERSPECTIVE_FILTER_TO_CODE;

export default function StrategicMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GoalForMap[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [perspectiveFilter, setPerspectiveFilter] = useState<string>('all');

  const fetchMapData = useCallback(async () => {
    const findParentFromEdges = (goalId: string, edgesParam: MapEdge[]): string | null => {
      const edge = edgesParam.find(e => e.target === goalId);
      return edge?.source ?? null;
    };

    const mapStatus = (status: string): GoalForMap['status'] => {
      const statusMap: Record<string, GoalForMap['status']> = {
        'ON_TRACK': 'ON_TRACK',
        'AT_RISK': 'AT_RISK',
        'DELAYED': 'DELAYED',
        'NOT_STARTED': 'NOT_STARTED',
        'COMPLETED': 'COMPLETED',
      };
      return statusMap[status] || 'NOT_STARTED';
    };

    setLoading(true);
    try {
      const response = await fetch('/api/strategic/map');
      if (response.ok) {
        const result: MapApiResponse = await response.json();
        
        const goalsFromNodes: GoalForMap[] = result.nodes.map((node) => ({
          id: node.id,
          code: node.data.code,
          description: node.data.description,
          perspectiveId: node.data.perspectiveCode,
          progress: node.data.progress,
          status: mapStatus(node.data.status),
          targetValue: node.data.targetValue,
          currentValue: node.data.currentValue,
          unit: node.data.unit,
          parentGoalId: findParentFromEdges(node.id, result.edges),
          kpiCount: 0,
          ownerName: 'Responsável',
        }));

        setGoals(goalsFromNodes);
        setEdges(result.edges);
      }
    } catch (error) {
      console.error('Erro ao carregar mapa estratégico:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const getStatusColor = (status: GoalForMap['status']): string => {
    const colorMap: Record<GoalForMap['status'], string> = {
      'ON_TRACK': 'text-green-400',
      'AT_RISK': 'text-yellow-400',
      'DELAYED': 'text-red-400',
      'NOT_STARTED': 'text-gray-400',
      'COMPLETED': 'text-blue-400',
    };
    return colorMap[status] || 'text-gray-400';
  };

  const handleGoalClick = useCallback((goalId: string) => {
    router.push(`/strategic/goals/${goalId}`);
  }, [router]);

  // Filtrar usando perspectiveId que agora é o código (FIN, CLI, INT, LRN)
  const filteredGoals = goals.filter((goal) => {
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (perspectiveFilter !== 'all') {
      // Comparação direta com o código da perspectiva
      if (goal.perspectiveId !== perspectiveFilter) {
        return false;
      }
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon="🗺️"
          title="Mapa Estratégico"
          description="Visualização das relações causa-efeito BSC"
          recordCount={goals.length}
          showBack
          onRefresh={fetchMapData}
          isLoading={loading}
          actions={
            <>
              <RippleButton
                variant="default"
                onClick={() => router.push('/strategic/goals/new')}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Objetivo
              </RippleButton>
            </>
          }
        />

        {/* Status Summary Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <EnterpriseMetricCard
              icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
              badge="No Prazo"
              badgeEmoji="✅"
              title="No Prazo"
              value={statusCounts.onTrack}
              subtitle="≥80% do progresso"
              variant="green"
              delay={0.2}
            />
            <EnterpriseMetricCard
              icon={<Clock className="h-6 w-6 text-amber-400" />}
              badge="Em Risco"
              badgeEmoji="⚠️"
              title="Em Risco"
              value={statusCounts.atRisk}
              subtitle="50-79% do progresso"
              variant="yellow"
              delay={0.3}
            />
            <EnterpriseMetricCard
              icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
              badge="Atrasado"
              badgeEmoji="❌"
              title="Atrasados"
              value={statusCounts.delayed}
              subtitle="<50% do progresso"
              variant="red"
              delay={0.4}
              isUrgent={statusCounts.delayed > 0}
            />
            <EnterpriseMetricCard
              icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
              badge="Concluído"
              badgeEmoji="🏆"
              title="Concluídos"
              value={statusCounts.completed}
              subtitle="100% alcançado"
              variant="blue"
              delay={0.5}
            />
          </div>
        </StaggerContainer>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <Card className="bg-gray-900/50 border-gray-800 p-4">
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
                <SelectItem value="FIN">Financeira</SelectItem>
                <SelectItem value="CLI">Cliente</SelectItem>
                <SelectItem value="INT">Processos</SelectItem>
                <SelectItem value="LRN">Aprendizado</SelectItem>
              </Select>
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

        {/* Legend Premium */}
        <FadeIn delay={0.3}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm
              flex items-center gap-8 flex-wrap"
          >
            <span className="text-white/60 flex items-center gap-2">
              <Info size={16} /> Legenda:
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> 
              <span className="text-white/70 text-sm">No Prazo (≥80%)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> 
              <span className="text-white/70 text-sm">Em Risco (50-79%)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" /> 
              <span className="text-white/70 text-sm">Atrasado (&lt;50%)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> 
              <span className="text-white/70 text-sm">Concluído</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500" /> 
              <span className="text-white/70 text-sm">Não Iniciado</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-8 h-0.5 bg-purple-500" /> 
              <span className="text-white/70 text-sm">Relação causa-efeito</span>
            </span>
          </motion.div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
