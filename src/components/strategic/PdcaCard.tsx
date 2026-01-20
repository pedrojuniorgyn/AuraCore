"use client";

/**
 * PdcaCard - Card para exibição em Kanban PDCA
 * 
 * @module components/strategic
 */
import { 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { ProgressBar } from '@tremor/react';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type PdcaPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT';

interface PdcaCardProps {
  id: string;
  code: string;
  what: string;
  who: string;
  whenEnd: string;
  completionPercent: number;
  priority: Priority;
  isOverdue: boolean;
  daysUntilDue: number;
  onClick?: () => void;
  isDragging?: boolean;
}

// Safelist pattern - classes explícitas para Tailwind
const PRIORITY_STYLES = {
  LOW: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
  },
  MEDIUM: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
  },
  HIGH: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/50',
  },
  CRITICAL: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
  },
} as const;

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export function PdcaCard({
  code,
  what,
  who,
  completionPercent,
  priority,
  isOverdue,
  daysUntilDue,
  onClick,
  isDragging = false,
}: PdcaCardProps) {
  const priorityStyle = PRIORITY_STYLES[priority] || PRIORITY_STYLES.MEDIUM;

  // Cor da barra de progresso
  const getProgressColor = (): 'emerald' | 'amber' | 'red' | 'blue' => {
    if (completionPercent >= 100) return 'emerald';
    if (isOverdue) return 'red';
    if (completionPercent >= 70) return 'blue';
    if (completionPercent >= 40) return 'amber';
    return 'blue';
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-3 bg-gray-800 rounded-lg border cursor-pointer 
        transition-all duration-200 hover:bg-gray-750 hover:shadow-lg
        ${isDragging ? 'shadow-xl rotate-2 scale-105 ring-2 ring-purple-500' : ''}
        ${isOverdue ? 'border-l-4 border-l-red-500 border-gray-700' : 'border-gray-700'}
      `}
    >
      {/* Header: Código + Prioridade */}
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-sm text-white">
          {code}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
          {PRIORITY_LABELS[priority]}
        </span>
      </div>

      {/* Descrição (What) */}
      <p className="text-sm text-gray-300 line-clamp-2 mb-3">
        {what}
      </p>

      {/* Info: Responsável + Data */}
      <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {who}
        </span>
        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : ''}`}>
          {isOverdue ? (
            <>
              <AlertTriangle className="w-3 h-3" />
              {Math.abs(daysUntilDue)}d atrasado
            </>
          ) : daysUntilDue === 0 ? (
            <>
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400">Hoje</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              {daysUntilDue}d restantes
            </>
          )}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Progresso</span>
          <span className="text-xs text-gray-400 font-medium">{completionPercent}%</span>
        </div>
        <ProgressBar 
          value={completionPercent} 
          color={getProgressColor()}
          className="h-1.5"
        />
      </div>

      {/* Indicador de conclusão */}
      {completionPercent >= 100 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Pronto para avançar
          <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

export type { PdcaCardProps, Priority, PdcaPhase };
