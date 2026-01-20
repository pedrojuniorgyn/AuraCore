"use client";

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GoalNode } from './GoalNode';
import { 
  DollarSign, 
  Users, 
  Cog, 
  GraduationCap,
  type LucideIcon 
} from 'lucide-react';

// Código de perspectiva BSC (FIN, CLI, INT, LRN)
type PerspectiveCode = 'FIN' | 'CLI' | 'INT' | 'LRN';

interface GoalData {
  id: string;
  code: string;
  description: string;
  perspectiveId: string; // Agora é o código da perspectiva (FIN, CLI, INT, LRN)
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'NOT_STARTED' | 'COMPLETED';
  targetValue: number;
  currentValue: number;
  unit: string;
  kpiCount: number;
  ownerName?: string;
  parentGoalId?: string | null;
}

interface StrategicMapProps {
  goals: GoalData[];
  onGoalClick?: (goalId: string) => void;
}

// Configuração de perspectivas usando código BSC (FIN, CLI, INT, LRN)
const perspectiveConfig: Record<PerspectiveCode, {
  icon: LucideIcon;
  label: string;
  color: string;
  yPosition: number;
}> = {
  FIN: {
    icon: DollarSign,
    label: 'Financeira',
    color: '#fbbf24',
    yPosition: 50,
  },
  CLI: {
    icon: Users,
    label: 'Cliente',
    color: '#3b82f6',
    yPosition: 250,
  },
  INT: {
    icon: Cog,
    label: 'Processos Internos',
    color: '#22c55e',
    yPosition: 450,
  },
  LRN: {
    icon: GraduationCap,
    label: 'Aprendizado e Crescimento',
    color: '#a855f7',
    yPosition: 650,
  },
};

const nodeTypes = {
  goalNode: GoalNode,
};

/**
 * Normaliza o código de perspectiva para um dos valores válidos
 */
function normalizePerspectiveCode(perspectiveId: string): PerspectiveCode {
  const code = perspectiveId.toUpperCase();
  
  // Verificar se já é um código válido
  if (code === 'FIN' || code === 'CLI' || code === 'INT' || code === 'LRN') {
    return code;
  }
  
  // Fallback para casos legados (não deve acontecer com a nova API)
  if (code.includes('FINANC') || code.startsWith('FIN')) return 'FIN';
  if (code.includes('CLIENT') || code.includes('CUSTOMER') || code.startsWith('CLI')) return 'CLI';
  if (code.includes('PROCESS') || code.includes('INTERNAL') || code.startsWith('INT')) return 'INT';
  if (code.includes('LEARN') || code.includes('GROWTH') || code.startsWith('LRN')) return 'LRN';
  
  return 'FIN'; // Default fallback
}

export function StrategicMap({ goals, onGoalClick }: StrategicMapProps) {
  // Group goals by perspective code
  const goalsByPerspective = useMemo(() => {
    const groups: Record<PerspectiveCode, GoalData[]> = {
      FIN: [],
      CLI: [],
      INT: [],
      LRN: [],
    };

    goals.forEach(goal => {
      const perspectiveCode = normalizePerspectiveCode(goal.perspectiveId);
      groups[perspectiveCode].push(goal);
    });

    return groups;
  }, [goals]);

  // Create nodes from goals
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    Object.entries(goalsByPerspective).forEach(([perspective, perspectiveGoals]) => {
      const config = perspectiveConfig[perspective as PerspectiveCode];
      
      perspectiveGoals.forEach((goal, index) => {
        nodes.push({
          id: goal.id,
          type: 'goalNode',
          position: { 
            x: 100 + (index * 300), 
            y: config.yPosition 
          },
          data: {
            code: goal.code,
            description: goal.description,
            progress: goal.progress,
            status: goal.status,
            targetValue: goal.targetValue,
            currentValue: goal.currentValue,
            unit: goal.unit,
            kpiCount: goal.kpiCount,
            ownerName: goal.ownerName,
          },
        });
      });
    });

    return nodes;
  }, [goalsByPerspective]);

  // Create edges from parent relationships
  const initialEdges: Edge[] = useMemo(() => {
    return goals
      .filter(goal => goal.parentGoalId)
      .map(goal => ({
        id: `${goal.parentGoalId}-${goal.id}`,
        source: goal.parentGoalId!,
        target: goal.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#a855f7', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#a855f7',
        },
      }));
  }, [goals]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onGoalClick?.(node.id);
  }, [onGoalClick]);

  return (
    <div className="w-full h-[700px] bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 rounded-xl overflow-hidden border border-white/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background color="#ffffff10" gap={20} size={1} />
        <Controls 
          className="!bg-white/10 !border-white/10 !rounded-xl !backdrop-blur-sm
            [&>button]:!bg-white/10 [&>button]:!border-white/10 
            [&>button]:!text-white [&>button:hover]:!bg-white/20" 
        />
        <MiniMap 
          nodeColor={(node) => {
            const data = node.data as { status?: string };
            switch (data?.status) {
              case 'ON_TRACK': return '#10b981';
              case 'AT_RISK': return '#f59e0b';
              case 'DELAYED': return '#ef4444';
              case 'COMPLETED': return '#3b82f6';
              default: return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-gray-800/80 !border-white/10 !rounded-xl !backdrop-blur-sm"
          style={{ width: 150, height: 100 }}
        />

        {/* Perspective Labels Premium */}
        <Panel position="top-left" className="space-y-2">
          {Object.entries(perspectiveConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div 
                key={key}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm 
                  rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                style={{ borderLeftColor: config.color, borderLeftWidth: 3 }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-sm text-white font-medium">{config.label}</span>
              </div>
            );
          })}
        </Panel>
      </ReactFlow>
    </div>
  );
}
