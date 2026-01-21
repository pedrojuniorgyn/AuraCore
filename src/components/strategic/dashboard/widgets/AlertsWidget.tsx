'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_ALERTS = [
  { id: '1', type: 'warning', message: 'KPI "OTD" abaixo da meta por 3 dias', time: '2h atrás' },
  { id: '2', type: 'error', message: 'Plano de ação vencido: Revisão contratos', time: '5h atrás' },
  { id: '3', type: 'info', message: 'Novo ciclo PDCA iniciado', time: '1 dia atrás' },
  { id: '4', type: 'success', message: 'Meta Q4 atingida com sucesso!', time: '2 dias atrás' },
];

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
};

export function AlertsWidget(_props: Props) {
  const alerts = MOCK_ALERTS;

  return (
    <div className="h-full space-y-2 overflow-auto">
      {alerts.map((alert, index) => {
        const config = ALERT_CONFIG[alert.type as keyof typeof ALERT_CONFIG];
        const Icon = config.icon;

        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg ${config.bg} border border-white/5`}
          >
            <div className="flex items-start gap-3">
              <Icon size={18} className={config.color} />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm">{alert.message}</p>
                <span className="text-white/40 text-xs">{alert.time}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
