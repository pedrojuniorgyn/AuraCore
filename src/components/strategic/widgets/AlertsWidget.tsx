'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING';
  title: string;
  value?: string;
}

interface Props {
  alerts: Alert[];
}

export function AlertsWidget({ alerts }: Props) {
  const critical = alerts.filter(a => a.type === 'CRITICAL');
  const warning = alerts.filter(a => a.type === 'WARNING');

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Summary */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {critical.length} críticos
        </div>
        <div className="flex items-center gap-2 text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {warning.length} em risco
        </div>
      </div>

      {/* List */}
      <div className="space-y-2 flex-1 overflow-auto">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            Nenhum alerta ativo
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg ${
                alert.type === 'CRITICAL' ? 'bg-red-500/10' : 'bg-yellow-500/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle 
                  size={14} 
                  className={`mt-0.5 flex-shrink-0 ${alert.type === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400'}`} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{alert.title}</p>
                  {alert.value && (
                    <p className="text-white/50 text-xs">{alert.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Link */}
      <Link
        href="/strategic/war-room"
        className="flex items-center justify-center gap-1 text-purple-400 text-sm hover:underline pt-2 border-t border-white/10"
      >
        Ver todos <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export type { Alert as WidgetAlert };
