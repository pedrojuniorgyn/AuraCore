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

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      // Usar a API /api/strategic/map que já retorna perspectiveCode
      const response = await fetch('/api/strategic/map');
      if (response.ok) {
        const result: MapApiResponse = await response.json();
        
        // Transformar nodes para o formato esperado pelo StrategicMap
        const goalsFromNodes: GoalForMap[] = result.nodes.map((node) => ({
          id: node.id,
          code: node.data.code,
          description: node.data.description,
          perspectiveId: node.data.perspectiveCode, // Usar o código (FIN, CLI, INT, LRN)
          progress: node.data.progress,
          status: mapStatus(node.data.status),
          targetValue: node.data.targetValue,
          currentValue: node.data.currentValue,
          unit: node.data.unit,
          parentGoalId: findParentFromEdges(node.id, result.edges),
          kpiCount: 0, // Contagem de KPIs (aguardando endpoint dedicado)
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
  };

  // Encontrar parentGoalId a partir das edges
  const findParentFromEdges = (goalId: string, edges: MapEdge[]): string | null => {
    const edge = edges.find(e => e.target === goalId);
    return edge?.source ?? null;
  };

  const mapStatus = (status: string): GoalForMap['status'] => {
    const statusMap: Record<string, GoalForMap['status']> = {
      'ON_TRACK': 'ON_TRACK',
      'AT_RISK': 'AT_RISK',
      'DELAYED': 'DELAYED',
      'NOT_STARTED': 'NOT_STARTED',
      'COMPLETED': 'COMPLETED',
      'ACHIEVED': 'COMPLETED',
    };
    return statusMap[status] || 'NOT_STARTED';
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
                onClick={fetchMapData}
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
                  <SelectItem value="FIN">Financeira</SelectItem>
                  <SelectItem value="CLI">Cliente</SelectItem>
                  <SelectItem value="INT">Processos</SelectItem>
                  <SelectItem value="LRN">Aprendizado</SelectItem>
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
