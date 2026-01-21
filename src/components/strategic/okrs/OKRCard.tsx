'use client';

import { motion } from 'framer-motion';
import { Target, Calendar, User, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { OKR } from '@/lib/okrs/okr-types';
import { LEVEL_LABELS, STATUS_LABELS } from '@/lib/okrs/okr-types';

interface Props {
  okr: OKR;
  onEdit?: (okr: OKR) => void;
  onDelete?: (okr: OKR) => void;
}

const statusColors: Record<OKR['status'], string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export function OKRCard({ okr, onEdit, onDelete }: Props) {
  const completedKRs = okr.keyResults.filter((kr) => kr.progress >= 100).length;
  const totalKRs = okr.keyResults.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Target className="text-purple-400" size={20} />
          </div>
          <div>
            <span className="text-xs text-white/40 uppercase">{LEVEL_LABELS[okr.level]}</span>
            <h3 className="text-white font-semibold">{okr.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-xs ${statusColors[okr.status]}`}>
            {STATUS_LABELS[okr.status]}
          </span>
          {(onEdit || onDelete) && (
            <button className="p-1 rounded-lg hover:bg-white/10 text-white/40">
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>
      </div>

      {okr.description && (
        <p className="text-white/60 text-sm mb-4 line-clamp-2">{okr.description}</p>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/60">Progresso Geral</span>
          <span className="text-white font-medium">{okr.progress}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${okr.progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              okr.progress >= 70
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : okr.progress >= 40
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                  : 'bg-gradient-to-r from-red-500 to-pink-400'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-white/40 mb-4">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{okr.periodLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <User size={14} />
          <span>{okr.ownerName}</span>
        </div>
        <div>
          <span>
            {completedKRs}/{totalKRs} KRs
          </span>
        </div>
      </div>

      <Link
        href={`/strategic/okrs/${okr.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl
          bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        <span>Ver Detalhes</span>
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
}
