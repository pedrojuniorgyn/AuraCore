'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus } from 'lucide-react';

export type WidgetType = 
  | 'health-score' 
  | 'alerts' 
  | 'trend-chart' 
  | 'kpi-summary' 
  | 'actions' 
  | 'aurora-insight'
  | 'achievements'
  | 'pdca-active';

interface WidgetOption {
  type: WidgetType;
  name: string;
  icon: string;
  description: string;
  defaultSize: { w: number; h: number };
}

const widgetOptions: WidgetOption[] = [
  { 
    type: 'health-score', 
    name: 'Health Score', 
    icon: '❤️', 
    description: 'Indicador geral de saúde estratégica',
    defaultSize: { w: 1, h: 2 } 
  },
  { 
    type: 'alerts', 
    name: 'Alertas Críticos', 
    icon: '🚨', 
    description: 'KPIs em estado crítico ou de risco',
    defaultSize: { w: 1, h: 2 } 
  },
  { 
    type: 'trend-chart', 
    name: 'Tendência Semanal', 
    icon: '📊', 
    description: 'Gráfico de evolução da semana',
    defaultSize: { w: 2, h: 2 } 
  },
  { 
    type: 'kpi-summary', 
    name: 'KPIs por Perspectiva', 
    icon: '🎯', 
    description: 'Resumo das 4 perspectivas BSC',
    defaultSize: { w: 3, h: 1 } 
  },
  { 
    type: 'actions', 
    name: 'Top Ações', 
    icon: '✅', 
    description: 'Planos de ação prioritários',
    defaultSize: { w: 1, h: 2 } 
  },
  { 
    type: 'aurora-insight', 
    name: 'Aurora AI', 
    icon: '🤖', 
    description: 'Insights automáticos da IA',
    defaultSize: { w: 1, h: 1 } 
  },
  { 
    type: 'achievements', 
    name: 'Conquistas Recentes', 
    icon: '🏆', 
    description: 'Últimas badges desbloqueadas',
    defaultSize: { w: 1, h: 1 } 
  },
  { 
    type: 'pdca-active', 
    name: 'Ciclos PDCA', 
    icon: '🔄', 
    description: 'Ciclos PDCA em andamento',
    defaultSize: { w: 1, h: 2 } 
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeWidgets: WidgetType[];
  onToggleWidget: (type: WidgetType, defaultSize: { w: number; h: number }) => void;
}

export function WidgetPicker({ isOpen, onClose, activeWidgets, onToggleWidget }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-2xl z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Adicionar Widget</h2>
                  <p className="text-white/50 text-sm mt-1">
                    Selecione os widgets para seu dashboard
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50">
                  <X size={20} />
                </button>
              </div>

              {/* Widget Grid */}
              <div className="p-6 grid grid-cols-4 gap-4">
                {widgetOptions.map((widget) => {
                  const isActive = activeWidgets.includes(widget.type);
                  
                  return (
                    <button
                      key={widget.type}
                      onClick={() => onToggleWidget(widget.type, widget.defaultSize)}
                      className={`
                        p-4 rounded-xl border text-center transition-all
                        ${isActive 
                          ? 'bg-purple-500/20 border-purple-500/50' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                      `}
                    >
                      <span className="text-3xl block mb-2">{widget.icon}</span>
                      <p className="text-white font-medium text-sm">{widget.name}</p>
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">
                        {widget.description}
                      </p>
                      <div className="mt-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-purple-400 text-xs">
                            <Check size={12} /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-white/40 text-xs">
                            <Plus size={12} /> Adicionar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { widgetOptions };
