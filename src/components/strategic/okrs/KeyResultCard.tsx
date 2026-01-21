'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Link as LinkIcon, History, Edit2 } from 'lucide-react';
import Link from 'next/link';
import type { KeyResult } from '@/lib/okrs/okr-types';
import { KR_STATUS_LABELS, KR_STATUS_COLORS } from '@/lib/okrs/okr-types';

interface Props {
  keyResult: KeyResult;
  onUpdate?: (value: number, comment?: string) => void;
  onEdit?: () => void;
  showLinks?: boolean;
}

export function KeyResultCard({ keyResult, onUpdate, onEdit, showLinks = true }: Props) {
  const formatValue = (value: number): string => {
    switch (keyResult.metricType) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return `${value}${keyResult.unit ? ` ${keyResult.unit}` : ''}`;
    }
  };

  const statusDotColor = KR_STATUS_COLORS[keyResult.status].replace('bg-', '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white/5 rounded-xl border border-white/10"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-white font-medium">{keyResult.title}</h4>
          {keyResult.description && (
            <p className="text-white/50 text-sm mt-1">{keyResult.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-lg text-xs ${KR_STATUS_COLORS[keyResult.status].replace('bg-', 'bg-')}/20 text-${statusDotColor.replace('-500', '-400')}`}
          >
            {KR_STATUS_LABELS[keyResult.status]}
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <span className="text-white/40 block">Início</span>
          <span className="text-white">{formatValue(keyResult.startValue)}</span>
        </div>
        <div>
          <span className="text-white/40 block">Atual</span>
          <span className="text-white font-medium">{formatValue(keyResult.currentValue)}</span>
        </div>
        <div>
          <span className="text-white/40 block">Meta</span>
          <span className="text-white">{formatValue(keyResult.targetValue)}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white/40">Progresso</span>
          <span className="text-white">{keyResult.progress}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${keyResult.progress}%` }}
            className={`h-full rounded-full ${
              keyResult.progress >= 100
                ? 'bg-blue-500'
                : keyResult.progress >= 70
                  ? 'bg-green-500'
                  : keyResult.progress >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            }`}
          />
        </div>
      </div>

      {showLinks && (keyResult.linkedKpiId || keyResult.linkedActionPlanId) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {keyResult.linkedKpiId && (
            <Link
              href={`/strategic/kpis/${keyResult.linkedKpiId}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg
                bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20"
            >
              <TrendingUp size={12} />
              <span>{keyResult.linkedKpiName || 'KPI vinculado'}</span>
            </Link>
          )}
          {keyResult.linkedActionPlanId && (
            <Link
              href={`/strategic/action-plans/${keyResult.linkedActionPlanId}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg
                bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20"
            >
              <LinkIcon size={12} />
              <span>{keyResult.linkedActionPlanName || 'Plano vinculado'}</span>
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {onUpdate && (
          <button
            onClick={() => {
              const newValue = prompt('Novo valor:', keyResult.currentValue.toString());
              if (newValue !== null) {
                const comment = prompt('Comentário (opcional):');
                onUpdate(parseFloat(newValue), comment || undefined);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl
              bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm"
          >
            <TrendingUp size={14} />
            <span>Atualizar</span>
          </button>
        )}
        <button
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl
            bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm"
        >
          <History size={14} />
          <span>Histórico</span>
        </button>
      </div>
    </motion.div>
  );
}
