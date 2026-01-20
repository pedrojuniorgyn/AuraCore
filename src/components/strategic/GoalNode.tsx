"use client";

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle } from 'lucide-react';

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
  glow: string;
  gradientFrom: string;
  gradientTo: string;
  pulse?: boolean;
}> = {
  ON_TRACK: {
    bgColor: 'bg-emerald-900/50',
    borderColor: 'border-emerald-500/60',
    textColor: 'text-emerald-400',
    label: 'No Prazo',
    glow: 'shadow-emerald-500/20',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-green-400',
  },
  AT_RISK: {
    bgColor: 'bg-amber-900/50',
    borderColor: 'border-amber-500/60',
    textColor: 'text-amber-400',
    label: 'Em Risco',
    glow: 'shadow-amber-500/20',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-yellow-400',
  },
  DELAYED: {
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-500/60',
    textColor: 'text-red-400',
    label: 'Atrasado',
    glow: 'shadow-red-500/20',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-400',
    pulse: true,
  },
  NOT_STARTED: {
    bgColor: 'bg-gray-800/50',
    borderColor: 'border-gray-600/60',
    textColor: 'text-gray-400',
    label: 'Não Iniciado',
    glow: 'shadow-gray-500/10',
    gradientFrom: 'from-gray-500',
    gradientTo: 'to-gray-400',
  },
  COMPLETED: {
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-500/60',
    textColor: 'text-blue-400',
    label: 'Concluído',
    glow: 'shadow-blue-500/20',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-400',
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        min-w-[200px] max-w-[280px] rounded-xl border-2 p-3 
        backdrop-blur-xl cursor-pointer
        ${config.bgColor} ${config.borderColor}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-purple-500/30' : ''}
        ${config.pulse ? 'animate-pulse' : ''}
        hover:shadow-xl ${config.glow}
      `}
    >
      {/* Handles estilizados */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded">
            {data.code}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ProgressTrend progress={data.progress} />
          <Target className={`w-4 h-4 ${config.textColor}`} />
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-white font-medium line-clamp-2">
        {data.description}
      </p>

      {/* Progress Bar animado com gradiente */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Progresso</span>
          <span className={`font-bold ${config.textColor}`}>{data.progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(data.progress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}
          />
        </div>
      </div>

      {/* Values */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500">Atual: </span>
          <span className="text-white font-medium">{data.currentValue} {data.unit}</span>
        </div>
        <div>
          <span className="text-gray-500">Meta: </span>
          <span className="text-gray-300">{data.targetValue} {data.unit}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {data.kpiCount} KPI{data.kpiCount !== 1 ? 's' : ''}
        </span>
        {data.ownerName && (
          <span className="text-purple-400 truncate max-w-[120px]">
            {data.ownerName}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export const GoalNode = memo(GoalNodeComponent);
