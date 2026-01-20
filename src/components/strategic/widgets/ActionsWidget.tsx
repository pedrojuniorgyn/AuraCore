'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';

interface Action {
  id: string;
  code: string;
  title: string;
  daysRemaining: number;
  status: 'ON_TIME' | 'AT_RISK' | 'LATE';
}

interface Props {
  actions: Action[];
}

const statusColors = {
  ON_TIME: { dot: 'bg-green-500', text: 'text-green-400' },
  AT_RISK: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
  LATE: { dot: 'bg-red-500', text: 'text-red-400' },
};

export function ActionsWidget({ actions }: Props) {
  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-auto">
        {actions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            Nenhuma ação pendente
          </div>
        ) : (
          actions.slice(0, 5).map((action) => {
            const colors = statusColors[action.status];
            
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{action.title}</p>
                  <p className="text-white/40 text-xs">{action.code}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs ${colors.text} flex-shrink-0`}>
                  <Clock size={12} />
                  {action.daysRemaining < 0 ? `${Math.abs(action.daysRemaining)}d atrás` : `${action.daysRemaining}d`}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/strategic/action-plans"
        className="flex items-center justify-center gap-1 text-purple-400 text-sm hover:underline pt-2 border-t border-white/10"
      >
        Ver todos <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export type { Action as WidgetAction };
