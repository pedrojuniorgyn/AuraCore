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

type PerspectiveType = 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL_PROCESS' | 'LEARNING_GROWTH';

interface GoalData {
  id: string;
  code: string;
  description: string;
  perspectiveId: string;
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

const perspectiveConfig: Record<PerspectiveType, {
  icon: LucideIcon;
  label: string;
  color: string;
  yPosition: number;
}> = {
  FINANCIAL: {
    icon: DollarSign,
    label: 'Financeira',
    color: '#10b981',
    yPosition: 50,
  },
  CUSTOMER: {
    icon: Users,
    label: 'Cliente',
    color: '#3b82f6',
    yPosition: 250,
  },
  INTERNAL_PROCESS: {
    icon: Cog,
    label: 'Processos Internos',
    color: '#f59e0b',
    yPosition: 450,
  },
  LEARNING_GROWTH: {
    icon: GraduationCap,
    label: 'Aprendizado e Crescimento',
    color: '#a855f7',
    yPosition: 650,
  },
};

const nodeTypes = {
  goalNode: GoalNode,
};

function getPerspectiveFromId(perspectiveId: string): PerspectiveType {
  // Map perspectiveId to type (adjust based on your data)
  const mapping: Record<string, PerspectiveType> = {
    'financial': 'FINANCIAL',
    'customer': 'CUSTOMER',
    'internal': 'INTERNAL_PROCESS',
    'learning': 'LEARNING_GROWTH',
  };
  
  // Try to find by keyword in the ID
  const lowerId = perspectiveId.toLowerCase();
  if (lowerId.includes('financ')) return 'FINANCIAL';
  if (lowerId.includes('client') || lowerId.includes('customer')) return 'CUSTOMER';
  if (lowerId.includes('process') || lowerId.includes('internal')) return 'INTERNAL_PROCESS';
  if (lowerId.includes('learn') || lowerId.includes('growth')) return 'LEARNING_GROWTH';
  
  return mapping[perspectiveId] || 'FINANCIAL';
}

export function StrategicMap({ goals, onGoalClick }: StrategicMapProps) {
  // Group goals by perspective
  const goalsByPerspective = useMemo(() => {
    const groups: Record<PerspectiveType, GoalData[]> = {
      FINANCIAL: [],
      CUSTOMER: [],
      INTERNAL_PROCESS: [],
      LEARNING_GROWTH: [],
    };

    goals.forEach(goal => {
      const perspective = getPerspectiveFromId(goal.perspectiveId);
      groups[perspective].push(goal);
    });

    return groups;
  }, [goals]);

  // Create nodes from goals
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    Object.entries(goalsByPerspective).forEach(([perspective, perspectiveGoals]) => {
      const config = perspectiveConfig[perspective as PerspectiveType];
      
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
    <div className="w-full h-[700px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
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
        <Background color="#374151" gap={20} />
        <Controls className="bg-gray-800 border-gray-700 rounded-lg" />
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
          className="bg-gray-800 border-gray-700 rounded-lg"
        />

        {/* Perspective Labels */}
        <Panel position="top-left" className="space-y-2">
          {Object.entries(perspectiveConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div 
                key={key}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-lg border border-gray-700"
                style={{ borderLeftColor: config.color, borderLeftWidth: 3 }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-sm text-white">{config.label}</span>
              </div>
            );
          })}
        </Panel>
      </ReactFlow>
    </div>
  );
}
