"use client";

/**
 * CriticalAlertPanel - Painel de alertas críticos para War Room
 * 
 * @module components/strategic
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Eye, FileText, ChevronRight } from 'lucide-react';

export interface CriticalAlert {
  id: string;
  type: 'CRITICAL' | 'WARNING';
  title: string;
  description: string;
  metric?: { current: number; target: number; unit: string };
  actionPlanId?: string;
  kpiId?: string;
  createdAt?: Date;
}

interface Props {
  alerts: CriticalAlert[];
  onDismiss?: (id: string) => void;
  onViewKpi?: (kpiId: string) => void;
  onCreatePlan?: (alertId: string) => void;
  onViewAll?: () => void;
  maxItems?: number;
}

export function CriticalAlertPanel({ 
  alerts, 
  onDismiss, 
  onViewKpi, 
  onCreatePlan, 
  onViewAll,
  maxItems = 5 
}: Props) {
  const criticalCount = alerts.filter(a => a.type === 'CRITICAL').length;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          🚨 Alertas Críticos
          {criticalCount > 0 && (
            <motion.span 
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs"
            >
              {criticalCount}
            </motion.span>
          )}
        </h3>
      </div>

      {/* Alerts List */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[280px] pr-1">
        <AnimatePresence mode="popLayout">
          {alerts.slice(0, maxItems).map((alert, i) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border relative group
                ${alert.type === 'CRITICAL' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
            >
              {/* Dismiss */}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 
                    hover:bg-white/10 transition-all"
                >
                  <X className="w-3 h-3 text-white/50" />
                </button>
              )}

              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0
                  ${alert.type === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400'}`} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{alert.title}</p>
                  <p className="text-white/50 text-xs mt-1 line-clamp-2">{alert.description}</p>
                  
                  {alert.metric && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-white/40">Meta: {alert.metric.target}{alert.metric.unit}</span>
                      <span className={alert.type === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400'}>
                        Atual: {alert.metric.current}{alert.metric.unit}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {alert.kpiId && onViewKpi && (
                      <button
                        onClick={() => onViewKpi(alert.kpiId!)}
                        className="px-2 py-1 rounded-lg bg-white/10 text-white/70 text-xs 
                          flex items-center gap-1 hover:bg-white/20 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> Ver KPI
                      </button>
                    )}
                    {!alert.actionPlanId && onCreatePlan && (
                      <button
                        onClick={() => onCreatePlan(alert.id)}
                        className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs 
                          flex items-center gap-1 hover:bg-purple-500/30 transition-colors"
                      >
                        <FileText className="w-3 h-3" /> Criar Plano
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {alerts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <span className="text-5xl">✅</span>
            <p className="text-white/50 text-sm mt-3">Nenhum alerta crítico</p>
            <p className="text-white/30 text-xs mt-1">Todos os indicadores estão dentro das metas</p>
          </motion.div>
        )}
      </div>

      {/* View All */}
      {alerts.length > maxItems && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10
            text-white/70 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
        >
          Ver todos ({alerts.length}) <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
