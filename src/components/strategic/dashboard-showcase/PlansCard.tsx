'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Target, ChevronRight } from 'lucide-react';

interface PlansData {
  active: number;
  completed: number;
  overdue: number;
}

interface Props {
  plans: PlansData;
}

export function PlansCard({ plans }: Props) {
  // Mock data for the mini chart - últimos 7 dias
  const chartData = [40, 65, 45, 80, 55, 90, 70];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Planos de Ação</h3>
        </div>
        <Link 
          href="/strategic/action-plans" 
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
        >
          Ver todos <ChevronRight size={14} />
        </Link>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"
        >
          <p className="text-2xl font-bold text-blue-400">{plans.active}</p>
          <p className="text-xs text-white/50">Ativos</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <p className="text-2xl font-bold text-green-400">{plans.completed}</p>
          <p className="text-xs text-white/50">Concluídos</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <p className="text-2xl font-bold text-red-400">{plans.overdue}</p>
          <p className="text-xs text-white/50">Atrasados</p>
        </motion.div>
      </div>

      {/* Mini chart */}
      <div className="flex-1 min-h-[80px]">
        <div className="h-full rounded-xl bg-white/5 flex items-end justify-around p-3">
          {chartData.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
              className="w-6 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
            />
          ))}
        </div>
        <p className="text-center text-white/40 text-xs mt-2">Últimos 7 dias</p>
      </div>
    </motion.div>
  );
}
