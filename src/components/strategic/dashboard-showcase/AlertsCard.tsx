'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Bell, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  message: string;
  time: string;
}

interface Props {
  alerts: Alert[];
}

const alertStyles: Record<string, string> = {
  danger: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const alertIcons: Record<string, React.ReactNode> = {
  danger: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Bell size={16} />,
};

export function AlertsCard({ alerts }: Props) {
  const urgentCount = alerts.filter(a => a.type === 'danger').length;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Alertas</h3>
        </div>
        {urgentCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">
            {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="space-y-3 flex-1 overflow-auto">
        <AnimatePresence>
          {alerts.slice(0, 4).map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-3 rounded-xl border flex items-start gap-3",
                alertStyles[alert.type]
              )}
            >
              {alertIcons[alert.type]}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 leading-snug">{alert.message}</p>
                <p className="text-xs opacity-60 mt-1">{alert.time}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <Link 
        href="/strategic/notifications" 
        className="flex items-center justify-center gap-1 text-purple-400 hover:text-purple-300 text-sm mt-4 py-2 transition-colors"
      >
        Ver todos os alertas <ChevronRight size={14} />
      </Link>
    </motion.div>
  );
}
