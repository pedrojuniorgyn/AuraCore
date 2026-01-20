"use client";

/**
 * PdcaCard - Card para exibição em Kanban PDCA
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  GripVertical,
} from 'lucide-react';

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

  // Gradiente da barra de progresso
  const getProgressGradient = (): string => {
    if (completionPercent >= 100) return 'from-emerald-500 to-green-400';
    if (isOverdue) return 'from-red-500 to-rose-400';
    if (completionPercent >= 70) return 'from-blue-500 to-cyan-400';
    if (completionPercent >= 40) return 'from-amber-500 to-yellow-400';
    return 'from-blue-500 to-cyan-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer 
        backdrop-blur-sm transition-all duration-200 
        hover:bg-white/10 hover:border-white/20 hover:shadow-lg
        ${isDragging ? 'shadow-xl shadow-purple-500/20 rotate-2 scale-105 ring-2 ring-purple-500' : ''}
        ${isOverdue ? 'border-l-4 border-l-red-500' : ''}
      `}
    >
      {/* Header: Código + Prioridade + Grip */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded">
          {code}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
            {PRIORITY_LABELS[priority]}
          </span>
          <GripVertical className="w-4 h-4 text-white/30" />
        </div>
      </div>

      {/* Descrição (What) */}
      <p className="text-sm text-white font-medium line-clamp-2 mb-3">
        {what}
      </p>

      {/* Barra de progresso animada */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient()}`}
        />
      </div>

      {/* Footer: Responsável + Data + Progresso */}
      <div className="flex justify-between items-center text-xs">
        <span className="flex items-center gap-1 text-white/50">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{who}</span>
        </span>
        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : 'text-white/50'}`}>
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
              {daysUntilDue}d
            </>
          )}
        </span>
        <span className="font-bold text-white/70">{completionPercent}%</span>
      </div>

      {/* Indicador de conclusão */}
      {completionPercent >= 100 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center justify-center gap-1 text-xs text-emerald-400 
            bg-emerald-500/10 rounded-lg py-1.5"
        >
          <CheckCircle className="w-3 h-3" />
          Pronto para avançar
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      )}
    </motion.div>
  );
}

export type { PdcaCardProps, Priority, PdcaPhase };
