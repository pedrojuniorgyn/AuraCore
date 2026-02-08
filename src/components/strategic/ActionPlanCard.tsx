"use client";

/**
 * ActionPlanCard - Card detalhado para Action Plan 5W2H
 * 
 * @module components/strategic
 */
import { 
  Clock, 
  User, 
  MapPin,
  AlertTriangle,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { ProgressBar } from '@tremor/react';
import { ResourceActionMenu } from './ResourceActionMenu';

type ActionPlanStatus = 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type PdcaPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT';

interface ActionPlanCardProps {
  id: string;
  code: string;
  what: string;
  who: string;
  whereLocation: string;
  whenStart: string;
  whenEnd: string;
  how: string;
  howMuchAmount?: number | null;
  howMuchCurrency?: string | null;
  pdcaCycle: PdcaPhase;
  completionPercent: number;
  priority: Priority;
  status: ActionPlanStatus;
  isOverdue: boolean;
  daysUntilDue?: number;
  followUpCount?: number;
  onClick?: () => void;
  isDragging?: boolean;
  onRefresh?: () => void;
}

// Safelist pattern - classes explícitas
const STATUS_STYLES = {
  DRAFT: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    label: 'Rascunho',
  },
  PENDING: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    label: 'Pendente',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    label: 'Em Andamento',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Concluído',
  },
  BLOCKED: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    label: 'Bloqueado',
  },
  CANCELLED: {
    bg: 'bg-gray-600/20',
    text: 'text-gray-500',
    label: 'Cancelado',
  },
} as const;

const PDCA_BADGE_STYLES = {
  PLAN: {
    bg: 'bg-blue-500',
    text: 'text-white',
  },
  DO: {
    bg: 'bg-amber-500',
    text: 'text-white',
  },
  CHECK: {
    bg: 'bg-purple-500',
    text: 'text-white',
  },
  ACT: {
    bg: 'bg-emerald-500',
    text: 'text-white',
  },
} as const;

const PRIORITY_DOTS = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-amber-400',
  CRITICAL: 'bg-red-400',
} as const;

export function ActionPlanCard({
  id,
  code,
  what,
  who,
  whereLocation,
  whenStart,
  whenEnd,
  howMuchAmount,
  howMuchCurrency,
  pdcaCycle,
  completionPercent,
  priority,
  status,
  isOverdue,
  daysUntilDue = 0,
  followUpCount = 0,
  onClick,
  isDragging = false,
  onRefresh,
}: ActionPlanCardProps) {
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const pdcaStyle = PDCA_BADGE_STYLES[pdcaCycle];
  const priorityDot = PRIORITY_DOTS[priority];

  // Formatar data
  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  // Formatar valor monetário
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 bg-gray-800 rounded-lg border cursor-pointer
        transition-all duration-200 hover:bg-gray-750 hover:shadow-lg
        ${isDragging ? 'shadow-xl rotate-2 scale-105 ring-2 ring-purple-500' : ''}
        ${isOverdue ? 'border-l-4 border-l-red-500 border-gray-700' : 'border-gray-700'}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${priorityDot}`} />
          <span className="font-semibold text-sm text-white">{code}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-1.5 py-0.5 rounded ${pdcaStyle.bg} ${pdcaStyle.text}`}>
            {pdcaCycle}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
          <ResourceActionMenu
            id={id}
            resourceType="action-plans"
            basePath="/strategic/action-plans"
            resourceName={what}
            onDeleteSuccess={onRefresh}
          />
        </div>
      </div>

      {/* WHAT - O que */}
      <p className="text-sm text-gray-200 line-clamp-2 mb-3 font-medium">
        {what}
      </p>

      {/* 5W2H Resumido */}
      <div className="space-y-1 text-xs text-gray-400 mb-3">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-gray-500" />
          <span className="text-gray-300">{who}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="truncate">{whereLocation}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span>{formatDate(whenStart)} → {formatDate(whenEnd)}</span>
          {isOverdue && (
            <span className="text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {Math.abs(daysUntilDue)}d
            </span>
          )}
        </div>
        {howMuchAmount && howMuchAmount > 0 && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-gray-500" />
            <span className="text-emerald-400">
              {formatMoney(howMuchAmount, howMuchCurrency || 'BRL')}
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Progresso</span>
          <span className="text-xs text-gray-400">{completionPercent}%</span>
        </div>
        <ProgressBar
          value={completionPercent}
          color={completionPercent >= 100 ? 'emerald' : isOverdue ? 'red' : 'blue'}
          className="h-1.5"
        />
      </div>

      {/* Footer: Follow-ups */}
      {followUpCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-purple-400">
          <MessageSquare className="w-3 h-3" />
          {followUpCount} follow-up(s) 3G
        </div>
      )}
    </div>
  );
}

export type { ActionPlanCardProps, ActionPlanStatus };
