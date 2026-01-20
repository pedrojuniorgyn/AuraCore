"use client";

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type GoalStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'NOT_STARTED' | 'COMPLETED';

interface GoalNodeData {
  code: string;
  description: string;
  progress: number;
  status: GoalStatus;
  targetValue: number;
  currentValue: number;
  unit: string;
  kpiCount: number;
  ownerName?: string;
}

const statusConfig: Record<GoalStatus, { 
  bgColor: string; 
  borderColor: string; 
  textColor: string;
  label: string;
}> = {
  ON_TRACK: {
    bgColor: 'bg-emerald-900/50',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-400',
    label: 'No Prazo',
  },
  AT_RISK: {
    bgColor: 'bg-amber-900/50',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-400',
    label: 'Em Risco',
  },
  DELAYED: {
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-500',
    textColor: 'text-red-400',
    label: 'Atrasado',
  },
  NOT_STARTED: {
    bgColor: 'bg-gray-800/50',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-400',
    label: 'Não Iniciado',
  },
  COMPLETED: {
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-400',
    label: 'Concluído',
  },
};

function ProgressTrend({ progress }: { progress: number }) {
  if (progress >= 80) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (progress >= 50) return <Minus className="w-3 h-3 text-amber-400" />;
  return <TrendingDown className="w-3 h-3 text-red-400" />;
}

function GoalNodeComponent({ data, selected }: NodeProps<GoalNodeData>) {
  const config = statusConfig[data.status];

  return (
    <div 
      className={`
        min-w-[200px] max-w-[280px] rounded-lg border-2 p-3 shadow-lg 
        transition-all duration-200
        ${config.bgColor} ${config.borderColor}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}
        hover:shadow-xl hover:scale-[1.02]
      `}
    >
      {/* Handles para conexões */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500 border-2 border-gray-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500 border-2 border-gray-900"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className={`w-4 h-4 ${config.textColor}`} />
          <span className="text-xs font-mono text-gray-400">{data.code}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
          {config.label}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-white font-medium line-clamp-2">
        {data.description}
      </p>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Progresso</span>
          <div className="flex items-center gap-1">
            <ProgressTrend progress={data.progress} />
            <span className={config.textColor}>{data.progress.toFixed(0)}%</span>
          </div>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              data.status === 'ON_TRACK' ? 'bg-emerald-500' :
              data.status === 'AT_RISK' ? 'bg-amber-500' :
              data.status === 'DELAYED' ? 'bg-red-500' :
              data.status === 'COMPLETED' ? 'bg-blue-500' :
              'bg-gray-500'
            }`}
            style={{ width: `${Math.min(data.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Values */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500">Atual: </span>
          <span className="text-white">{data.currentValue} {data.unit}</span>
        </div>
        <div>
          <span className="text-gray-500">Meta: </span>
          <span className="text-gray-300">{data.targetValue} {data.unit}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-700 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {data.kpiCount} KPI{data.kpiCount !== 1 ? 's' : ''}
        </span>
        {data.ownerName && (
          <span className="text-purple-400 truncate max-w-[120px]">
            {data.ownerName}
          </span>
        )}
      </div>
    </div>
  );
}

export const GoalNode = memo(GoalNodeComponent);
