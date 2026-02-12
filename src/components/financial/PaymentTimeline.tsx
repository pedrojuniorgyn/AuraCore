'use client';

/**
 * PaymentTimeline - Timeline visual de pagamentos e recebimentos
 * 
 * Exibe cronologia de movimentações financeiras.
 */
import { 
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  type: 'payment' | 'receipt' | 'billing' | 'reconciliation';
  title: string;
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  partner?: string;
}

interface PaymentTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
}

const TYPE_CONFIG = {
  payment: { icon: ArrowDownRight, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  receipt: { icon: ArrowUpRight, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  billing: { icon: CheckCircle2, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  reconciliation: { icon: Clock, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

const STATUS_ICON = {
  completed: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  pending: <Clock className="h-3 w-3 text-yellow-400" />,
  failed: <XCircle className="h-3 w-3 text-red-400" />,
};

export function PaymentTimeline({ events, maxItems = 15 }: PaymentTimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" />

      {displayEvents.map((event, idx) => {
        const config = TYPE_CONFIG[event.type];
        const Icon = config.icon;

        return (
          <div key={event.id} className="relative flex gap-4 py-3 group">
            {/* Timeline dot */}
            <div className={cn(
              'relative z-10 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border',
              config.bgColor,
              'border-white/10 group-hover:border-white/20 transition-all'
            )}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-3 border-b border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    {STATUS_ICON[event.status]}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{event.description}</p>
                  {event.partner && (
                    <p className="text-xs text-gray-600 mt-0.5">{event.partner}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'text-sm font-mono font-semibold',
                    event.type === 'receipt' || event.type === 'billing'
                      ? 'text-green-400'
                      : 'text-red-400'
                  )}>
                    {event.type === 'receipt' || event.type === 'billing' ? '+' : '-'}
                    R$ {event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(event.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {events.length > maxItems && (
        <div className="text-center py-3">
          <span className="text-xs text-gray-500">
            + {events.length - maxItems} movimentações anteriores
          </span>
        </div>
      )}
    </div>
  );
}
