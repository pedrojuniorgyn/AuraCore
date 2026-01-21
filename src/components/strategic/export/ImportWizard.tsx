'use client';

import { useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Download,
} from 'lucide-react';
import { useImport } from '@/hooks/useImport';
import { ImportMapping } from './ImportMapping';
import { ImportPreview } from './ImportPreview';
import type { ExportEntity, FieldDefinition } from '@/lib/export/export-types';
import { KPI_FIELDS, ACTION_PLAN_FIELDS } from '@/lib/export/export-types';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ExportEntity;
  onComplete?: () => void;
}

const steps = [
  { id: 'upload', label: 'Upload' },
  { id: 'mapping', label: 'Mapeamento' },
  { id: 'validation', label: 'Validação' },
  { id: 'importing', label: 'Importar' },
];

function ImportWizardInner({ isOpen, onClose, entity, onComplete }: ImportWizardProps) {
  const {
    step,
    file,
    columns,
    mappings,
    validation,
    result,
    isProcessing,
    error,
    setFile,
    setMappings,
    validate,
    importData,
    goBack,
    reset,
  } = useImport(entity);

  const fields: FieldDefinition[] = entity === 'kpi' ? KPI_FIELDS : ACTION_PLAN_FIELDS;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        setFile(droppedFile);
      }
    },
    [setFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
    },
    [setFile]
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleComplete = () => {
    onComplete?.();
    handleClose();
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
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 rounded-2xl border border-white/10 
            w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Importar Dados</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => {
                const isActive = s.id === step || (step === 'complete' && s.id === 'importing');
                const isPast = steps.findIndex((st) => st.id === step) > index || step === 'complete';

                return (
                  <div key={s.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center
                      ${isPast ? 'bg-purple-500' : isActive ? 'bg-purple-500/30' : 'bg-white/10'}`}
                    >
                      {isPast && !isActive ? (
                        <CheckCircle size={16} className="text-white" />
                      ) : (
                        <span className={`text-sm ${isActive ? 'text-purple-300' : 'text-white/40'}`}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span className={`ml-2 text-sm ${isActive ? 'text-white' : 'text-white/40'}`}>
                      {s.label}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${isPast ? 'bg-purple-500' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 min-h-[300px]">
            {/* Upload Step */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-white/20 rounded-2xl 
                    p-12 text-center hover:border-purple-500/50 transition-colors"
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileSpreadsheet size={48} className="mx-auto text-white/40 mb-4" />
                    <p className="text-white mb-1">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-white/40 text-sm">Formatos: .xlsx, .xls, .csv</p>
                  </label>
                </div>

                <button
                  className="flex items-center gap-2 text-purple-400 
                  hover:text-purple-300 text-sm transition-colors"
                >
                  <Download size={16} />
                  Baixar template de exemplo
                </button>
              </div>
            )}

            {/* Mapping Step */}
            {step === 'mapping' && (
              <ImportMapping
                columns={columns}
                mappings={mappings}
                fields={fields}
                onChange={setMappings}
              />
            )}

            {/* Validation Step */}
            {step === 'validation' && validation && <ImportPreview validation={validation} />}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={48} className="text-purple-400 animate-spin mb-4" />
                <p className="text-white">Importando dados...</p>
              </div>
            )}

            {/* Complete Step */}
            {step === 'complete' && result && (
              <div className="text-center py-8">
                <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Importação Concluída!</h3>
                <p className="text-white/60 mb-6">
                  {result.created} itens criados, {result.updated} atualizados, {result.skipped}{' '}
                  ignorados
                </p>
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-purple-500 text-white rounded-xl 
                    hover:bg-purple-600 transition-colors"
                >
                  Concluir
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 
                text-red-400 flex items-start gap-3"
              >
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Erro na importação</p>
                  <p className="text-sm mt-1">{error.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={step === 'upload' ? handleClose : goBack}
              disabled={isProcessing || step === 'complete'}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
                hover:bg-white/10 transition-colors disabled:opacity-50
                flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              {step === 'upload' ? 'Cancelar' : 'Voltar'}
            </button>

            {step !== 'complete' && step !== 'importing' && (
              <button
                onClick={step === 'validation' ? importData : validate}
                disabled={
                  isProcessing ||
                  (step === 'upload' && !file) ||
                  (step === 'validation' && validation?.validRows === 0)
                }
                className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                  hover:bg-purple-600 transition-colors disabled:opacity-50
                  disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : step === 'validation' ? (
                  <>
                    Importar {validation?.validRows || 0} itens
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export const ImportWizard = memo(ImportWizardInner);
