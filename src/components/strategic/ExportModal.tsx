"use client";

/**
 * ExportModal - Modal para configurar e executar exportação
 * 
 * @module components/strategic
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, FileSpreadsheet, FileText, FileDown, 
  Loader2, CheckCircle 
} from 'lucide-react';

export type ExportFormat = 'excel' | 'pdf' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeKpis: boolean;
  includeActionPlans: boolean;
  includePdca: boolean;
  includeSwot: boolean;
  includeGoals: boolean;
  dateFrom: string;
  dateTo: string;
  includeCharts: boolean;
  includeHistory: boolean;
  separateByPerspective: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

const FORMAT_CONFIG = {
  excel: { icon: FileSpreadsheet, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50', label: 'Excel', ext: '.xlsx' },
  pdf: { icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50', label: 'PDF', ext: '.pdf' },
  csv: { icon: FileDown, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50', label: 'CSV', ext: '.csv' },
};

const DATA_OPTIONS = [
  { key: 'includeKpis', label: 'KPIs e métricas' },
  { key: 'includeActionPlans', label: 'Planos de Ação' },
  { key: 'includePdca', label: 'Ciclos PDCA' },
  { key: 'includeSwot', label: 'Análise SWOT' },
  { key: 'includeGoals', label: 'Objetivos Estratégicos' },
] as const;

export function ExportModal({ isOpen, onClose, onExport }: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'excel',
    includeKpis: true,
    includeActionPlans: true,
    includePdca: true,
    includeSwot: false,
    includeGoals: false,
    dateFrom: '',
    dateTo: '',
    includeCharts: true,
    includeHistory: true,
    separateByPerspective: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(options);
      setIsComplete(true);
      setTimeout(() => {
        setIsComplete(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-lg max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
              shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Download className="text-purple-400" />
                  Exportar Dados
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Format Selection */}
                <div>
                  <label className="text-white/60 text-sm mb-3 block">Formato de Exportação</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['excel', 'pdf', 'csv'] as ExportFormat[]).map((format) => {
                      const config = FORMAT_CONFIG[format];
                      const Icon = config.icon;
                      const isSelected = options.format === format;

                      return (
                        <button
                          key={format}
                          onClick={() => updateOption('format', format)}
                          className={`p-4 rounded-xl border text-center transition-all
                            ${isSelected 
                              ? `${config.bgColor} ${config.borderColor}` 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                          <Icon className={`w-8 h-8 mx-auto mb-2 ${config.color}`} />
                          <p className="text-white font-medium">{config.label}</p>
                          <p className="text-white/40 text-xs">{config.ext}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Data Selection */}
                <div>
                  <label className="text-white/60 text-sm mb-3 block">Dados a Exportar</label>
                  <div className="space-y-2">
                    {DATA_OPTIONS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 
                          hover:bg-white/10 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={options[key]}
                          onChange={(e) => updateOption(key, e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 
                            text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-white/60 text-sm mb-3 block">Período (opcional)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={options.dateFrom}
                      onChange={(e) => updateOption('dateFrom', e.target.value)}
                      className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                        text-white focus:outline-none focus:border-purple-500/50"
                    />
                    <input
                      type="date"
                      value={options.dateTo}
                      onChange={(e) => updateOption('dateTo', e.target.value)}
                      className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                        text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <label className="text-white/60 text-sm mb-3 block">Opções Avançadas</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeCharts}
                        onChange={(e) => updateOption('includeCharts', e.target.checked)}
                        disabled={options.format !== 'pdf'}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 
                          text-purple-500 disabled:opacity-50"
                      />
                      <span className={`text-white ${options.format !== 'pdf' ? 'opacity-50' : ''}`}>
                        Incluir gráficos (apenas PDF)
                      </span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeHistory}
                        onChange={(e) => updateOption('includeHistory', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500"
                      />
                      <span className="text-white">Incluir histórico de alterações</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || isComplete}
                  className="px-6 py-2 rounded-xl bg-purple-500 text-white 
                    hover:bg-purple-600 transition-all flex items-center gap-2
                    disabled:opacity-50"
                >
                  {isComplete ? (
                    <>
                      <CheckCircle size={18} /> Concluído!
                    </>
                  ) : isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Exportando...
                    </>
                  ) : (
                    <>
                      <Download size={18} /> Exportar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
