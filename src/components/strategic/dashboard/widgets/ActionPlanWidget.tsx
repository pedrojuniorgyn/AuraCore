'use client';

import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle, Circle } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_PLANS = [
  { id: '1', title: 'Otimizar rotas de entrega', status: 'in_progress', dueDate: '2026-02-15', isOverdue: false },
  { id: '2', title: 'Implementar dashboard KPIs', status: 'completed', dueDate: '2026-01-20', isOverdue: false },
  { id: '3', title: 'Revisar contratos fornecedores', status: 'pending', dueDate: '2026-01-10', isOverdue: true },
  { id: '4', title: 'Treinamento equipe comercial', status: 'in_progress', dueDate: '2026-02-28', isOverdue: false },
];

const STATUS_CONFIG = {
  pending: { label: 'Pendente', icon: Circle, color: 'text-white/50' },
  in_progress: { label: 'Em Andamento', icon: Clock, color: 'text-blue-400' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'text-green-400' },
};

export function ActionPlanWidget({ widget }: Props) {
  const config = widget.config as { limit?: number; showOverdue?: boolean };
  const plans = MOCK_PLANS.slice(0, config.limit || 5);

  if (widget.type === 'action_plan_status') {
    // Status distribution pie
    const counts = {
      pending: plans.filter((p) => p.status === 'pending').length,
      in_progress: plans.filter((p) => p.status === 'in_progress').length,
      completed: plans.filter((p) => p.status === 'completed').length,
    };

    return (
      <div className="h-full flex items-center justify-center gap-6">
        <div className="space-y-2">
          {Object.entries(counts).map(([status, count]) => {
            const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            const Icon = statusConfig.icon;
            return (
              <div key={status} className="flex items-center gap-2">
                <Icon size={16} className={statusConfig.color} />
                <span className="text-white/70 text-sm">{statusConfig.label}</span>
                <span className={`font-bold ${statusConfig.color}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full space-y-2 overflow-auto">
      {plans.map((plan, index) => {
        const statusConfig = STATUS_CONFIG[plan.status as keyof typeof STATUS_CONFIG];
        const Icon = statusConfig.icon;

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-2 rounded-lg bg-white/5 border 
              ${plan.isOverdue ? 'border-red-500/30' : 'border-white/5'}`}
          >
            <div className="flex items-start gap-2">
              <Icon size={16} className={`mt-0.5 ${statusConfig.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm truncate">{plan.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {plan.isOverdue && config.showOverdue && (
                    <span className="flex items-center gap-1 text-red-400 text-xs">
                      <AlertTriangle size={12} />
                      Atrasado
                    </span>
                  )}
                  <span className="text-white/40 text-xs">
                    {new Date(plan.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
