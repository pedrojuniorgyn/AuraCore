'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BarChart3, Target, FileText, Flame, ArrowUpRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { icon: <BarChart3 size={18} />, label: 'Novo KPI', href: '/strategic/kpis/new', color: 'purple' },
  { icon: <Target size={18} />, label: 'Nova Meta', href: '/strategic/goals/new', color: 'blue' },
  { icon: <FileText size={18} />, label: 'Novo Plano', href: '/strategic/action-plans/new', color: 'green' },
  { icon: <Flame size={18} />, label: 'War Room', href: '/strategic/war-room', color: 'red' },
];

const colorMap: Record<string, string> = {
  purple: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/20',
  blue: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/20',
  green: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/20',
  red: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20',
};

export function QuickActionsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Ações Rápidas</h3>
      </div>
      
      <div className="space-y-2">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <Link
              href={action.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all border",
                colorMap[action.color]
              )}
            >
              {action.icon}
              <span className="font-medium text-sm flex-1">{action.label}</span>
              <ArrowUpRight size={14} className="opacity-50" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
