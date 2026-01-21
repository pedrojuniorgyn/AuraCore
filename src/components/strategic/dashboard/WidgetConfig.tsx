'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Widget, WidgetConfig as WidgetConfigType } from '@/lib/dashboard/dashboard-types';
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry';

interface Props {
  widget: Widget;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Partial<Widget>) => void;
}

const THEME_COLORS = [
  { id: 'purple', color: 'bg-purple-500', label: 'Roxo' },
  { id: 'blue', color: 'bg-blue-500', label: 'Azul' },
  { id: 'green', color: 'bg-green-500', label: 'Verde' },
  { id: 'yellow', color: 'bg-yellow-500', label: 'Amarelo' },
  { id: 'red', color: 'bg-red-500', label: 'Vermelho' },
  { id: 'gray', color: 'bg-gray-500', label: 'Cinza' },
];

export function WidgetConfigModal({ widget, isOpen, onClose, onSave }: Props) {
  const [title, setTitle] = useState(widget.title);
  const [config, setConfig] = useState<WidgetConfigType>(widget.config);

  const definition = WIDGET_REGISTRY[widget.type];

  const handleSave = () => {
    onSave({ title, config });
    onClose();
  };

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 
            flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-2xl border border-white/10 
              w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">{definition?.icon}</span>
                <h2 className="text-white font-semibold">Configurar Widget</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* KPI-specific options */}
              {(widget.type === 'kpi_card' ||
                widget.type === 'kpi_chart' ||
                widget.type === 'kpi_gauge') && (
                <>
                  <div className="space-y-3">
                    <label className="block text-white/60 text-sm">Opções de Exibição</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as Record<string, unknown>).showTrend === true}
                        onChange={(e) => updateConfig('showTrend', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 
                          text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white/80 text-sm">Mostrar tendência</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as Record<string, unknown>).showVariation === true}
                        onChange={(e) => updateConfig('showVariation', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 
                          text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white/80 text-sm">Mostrar variação %</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as Record<string, unknown>).showTarget === true}
                        onChange={(e) => updateConfig('showTarget', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 
                          text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white/80 text-sm">Mostrar meta</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as Record<string, unknown>).showStatus === true}
                        onChange={(e) => updateConfig('showStatus', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 
                          text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white/80 text-sm">Mostrar status (cor)</span>
                    </label>
                  </div>
                </>
              )}

              {/* Theme Color */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Cor do Tema</label>
                <div className="flex items-center gap-2">
                  {THEME_COLORS.map((themeColor) => (
                    <button
                      key={themeColor.id}
                      onClick={() => updateConfig('themeColor', themeColor.id)}
                      className={`w-8 h-8 rounded-full ${themeColor.color} 
                        flex items-center justify-center transition-transform
                        ${(config as Record<string, unknown>).themeColor === themeColor.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                      title={themeColor.label}
                    >
                      {(config as Record<string, unknown>).themeColor === themeColor.id && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-white/60 hover:text-white 
                  hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white 
                  hover:bg-purple-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
