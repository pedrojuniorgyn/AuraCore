'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileType,
  Download,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import type { ExportFormat, ExportEntity, ExportOptions } from '@/lib/export/export-types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: ExportEntity;
}

const formatOptions: {
  value: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Relatório formatado' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Dados editáveis' },
  { value: 'csv', label: 'CSV', icon: FileType, description: 'Simples e compatível' },
];

const entityOptions: { value: ExportEntity; label: string }[] = [
  { value: 'kpi', label: 'KPIs' },
  { value: 'action_plan', label: 'Planos de Ação' },
  { value: 'pdca_cycle', label: 'Ciclos PDCA' },
  { value: 'goal', label: 'Metas Estratégicas' },
  { value: 'dashboard_config', label: 'Configurações do Dashboard' },
];

function ExportModalInner({ isOpen, onClose, defaultEntity }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedEntities, setSelectedEntities] = useState<ExportEntity[]>(
    defaultEntity ? [defaultEntity] : ['kpi']
  );
  const [pdfOptions, setPdfOptions] = useState<{
    includeCharts: boolean;
    includeHistory: boolean;
    includeComments: boolean;
    includeAttachments: boolean;
    orientation: 'portrait' | 'landscape';
  }>({
    includeCharts: true,
    includeHistory: true,
    includeComments: true,
    includeAttachments: false,
    orientation: 'portrait',
  });

  const { isExporting, progress, error, exportData, exportPdf } = useExport();

  const toggleEntity = (entity: ExportEntity) => {
    setSelectedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const handleExport = async () => {
    const options: ExportOptions = {
      format: selectedFormat,
      entities: selectedEntities,
      options: selectedFormat === 'pdf' ? pdfOptions : undefined,
    };

    if (selectedFormat === 'pdf') {
      await exportPdf(options);
    } else {
      await exportData(options);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
            w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Exportar Dados</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Entity Selection */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">O que exportar?</label>
              <div className="space-y-2">
                {entityOptions.map((entity) => (
                  <label
                    key={entity.value}
                    className="flex items-center gap-3 p-3 rounded-xl 
                      bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEntities.includes(entity.value)}
                      onChange={() => toggleEntity(entity.value)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 
                        text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-white">{entity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Formato</label>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormat === format.value;

                  return (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`p-4 rounded-xl border transition-all text-center
                        ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                      <Icon
                        size={24}
                        className={`mx-auto mb-2 
                        ${isSelected ? 'text-purple-400' : 'text-white/60'}`}
                      />
                      <p className={`font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {format.label}
                      </p>
                      <p className="text-white/40 text-xs mt-1">{format.description}</p>
                      {isSelected && (
                        <CheckCircle size={16} className="text-purple-400 mx-auto mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PDF Options */}
            {selectedFormat === 'pdf' && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Opções do PDF</label>
                <div className="space-y-2 p-4 rounded-xl bg-white/5">
                  {[
                    { key: 'includeCharts', label: 'Incluir gráficos' },
                    { key: 'includeHistory', label: 'Incluir histórico de valores' },
                    { key: 'includeComments', label: 'Incluir comentários' },
                    { key: 'includeAttachments', label: 'Incluir anexos' },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfOptions[option.key as keyof typeof pdfOptions] as boolean}
                        onChange={(e) =>
                          setPdfOptions((prev) => ({
                            ...prev,
                            [option.key]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded border-white/20 bg-white/5 
                          text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white/80 text-sm">{option.label}</span>
                    </label>
                  ))}

                  <div className="flex items-center gap-4 pt-2 border-t border-white/10 mt-3">
                    <label className="text-white/60 text-sm">Orientação:</label>
                    <select
                      value={pdfOptions.orientation}
                      onChange={(e) =>
                        setPdfOptions((prev) => ({
                          ...prev,
                          orientation: e.target.value as 'portrait' | 'landscape',
                        }))
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 
                        text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="portrait" className="bg-gray-900">
                        Retrato
                      </option>
                      <option value="landscape" className="bg-gray-900">
                        Paisagem
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
                hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedEntities.length === 0}
              className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                hover:bg-purple-600 transition-colors disabled:opacity-50 
                disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Exportando... {progress}%
                </>
              ) : (
                <>
                  <Download size={18} />
                  Exportar
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export const ExportModal = memo(ExportModalInner);
