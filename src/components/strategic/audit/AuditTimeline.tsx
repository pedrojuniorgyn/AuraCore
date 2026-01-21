'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Target,
  ClipboardList,
  RefreshCw,
  Flag,
  Settings,
  Eye,
  Undo2,
} from 'lucide-react';
import type { AuditLog, AuditEntityType } from '@/lib/audit/audit-types';
import {
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
  ACTION_COLORS,
} from '@/lib/audit/audit-types';

interface AuditTimelineProps {
  logs: AuditLog[];
  onViewDetails: (log: AuditLog) => void;
  onRestore?: (log: AuditLog) => void;
}

const entityIcons: Record<AuditEntityType, React.ElementType> = {
  kpi: Target,
  action_plan: ClipboardList,
  pdca_cycle: RefreshCw,
  goal: Flag,
  template: Settings,
  integration: Settings,
  webhook: Settings,
  role: Settings,
  permission: Settings,
  report: ClipboardList,
  comment: ClipboardList,
  dashboard_config: Settings,
};

function AuditTimelineInner({ logs, onViewDetails, onRestore }: AuditTimelineProps) {
  // Group logs by date
  const groupedLogs = logs.reduce(
    (groups, log) => {
      const date = new Date(log.createdAt);
      let label: string;

      if (isToday(date)) {
        label = 'Hoje';
      } else if (isYesterday(date)) {
        label = 'Ontem';
      } else {
        label = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(log);
      return groups;
    },
    {} as Record<string, AuditLog[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(groupedLogs).map(([dateLabel, dateLogs]) => (
        <div key={dateLabel}>
          {/* Date Header */}
          <h3 className="text-white font-semibold mb-4 pb-2 border-b border-white/10">
            {dateLabel}
          </h3>

          {/* Timeline */}
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10" />

            <div className="space-y-6">
              {dateLogs.map((log, index) => {
                const Icon = entityIcons[log.entityType];
                const actionColor = ACTION_COLORS[log.action];

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-5 top-1 w-4 h-4 rounded-full 
                      border-2 border-gray-900 ${actionColor.split(' ')[1]}`}
                    />

                    {/* Content */}
                    <div
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 
                      transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${actionColor}`}>
                          <Icon size={16} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/60 text-sm">
                              {format(new Date(log.createdAt), 'HH:mm')}
                            </span>
                            <span className="text-white font-medium">{log.userName}</span>
                            <span className={`text-sm ${actionColor.split(' ')[0]}`}>
                              {ACTION_LABELS[log.action].toLowerCase()}
                            </span>
                            <span className="text-white/80">
                              {ENTITY_TYPE_LABELS[log.entityType].toLowerCase()}
                            </span>
                          </div>

                          <p className="text-white mt-1 font-medium">
                            &quot;{log.entityName}&quot;
                          </p>

                          {/* Changes summary */}
                          {log.changes && log.changes.length > 0 && (
                            <p className="text-white/50 text-sm mt-1">
                              {log.changes.length} campo
                              {log.changes.length !== 1 ? 's' : ''} alterado
                              {log.changes.length !== 1 ? 's' : ''}
                              {log.changes.slice(0, 2).map((c, i) => (
                                <span key={i}>
                                  {i === 0 ? ': ' : ', '}
                                  <span className="text-white/70">{c.field}</span>
                                </span>
                              ))}
                              {log.changes.length > 2 && `, +${log.changes.length - 2}`}
                            </p>
                          )}

                          {log.reason && (
                            <p className="text-white/40 text-sm mt-1 italic">
                              &quot;{log.reason}&quot;
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 
                          transition-opacity"
                        >
                          <button
                            onClick={() => onViewDetails(log)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                              hover:text-white transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </button>

                          {log.action === 'delete' && onRestore && (
                            <button
                              onClick={() => onRestore(log)}
                              className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 
                                hover:text-purple-300 transition-colors"
                              title="Restaurar"
                            >
                              <Undo2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const AuditTimeline = memo(AuditTimelineInner);
