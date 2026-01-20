'use client';

import { motion } from 'framer-motion';
import { Calendar, Users, Play, Settings, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Report {
  id: string;
  name: string;
  type: 'executive' | 'bsc' | 'actions' | 'kpis' | 'custom';
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  nextRun?: string | Date;
  lastRun?: string | Date;
  isActive: boolean;
}

interface Props {
  report: Report;
  onGenerate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeConfig = {
  executive: { icon: '📈', label: 'Executivo', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
  bsc: { icon: '🎯', label: 'BSC', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  actions: { icon: '✅', label: 'Ações', colorClass: 'text-green-400', bgClass: 'bg-green-500/20' },
  kpis: { icon: '📊', label: 'KPIs', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  custom: { icon: '📋', label: 'Personalizado', colorClass: 'text-gray-400', bgClass: 'bg-gray-500/20' },
};

const frequencyLabels = {
  manual: 'Manual',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export function ReportCard({ report, onGenerate, onEdit, onDelete }: Props) {
  const config = typeConfig[report.type];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10 
        hover:border-purple-500/30 transition-all group"
    >
      {/* Icon & Type */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${config.bgClass} 
          flex items-center justify-center text-2xl`}>
          {config.icon}
        </div>
        {!report.isActive && (
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-xs">
            Inativo
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-bold mb-1">{report.name}</h3>
      <p className={`${config.colorClass} text-sm mb-4`}>{config.label}</p>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Calendar size={14} />
          {frequencyLabels[report.frequency]}
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Users size={14} />
          {report.recipients.length} destinatário(s)
        </div>
        {report.nextRun && (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Clock size={14} />
            Próximo: {formatDistanceToNow(new Date(report.nextRun), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onGenerate(report.id)}
          className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-sm 
            font-medium hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
        >
          <Play size={14} /> Gerar
        </button>
        <button
          onClick={() => onEdit(report.id)}
          className="p-2 rounded-xl bg-white/10 text-white/70 
            hover:bg-white/20 transition-all"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => onDelete(report.id)}
          className="p-2 rounded-xl bg-white/10 text-red-400 
            hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
