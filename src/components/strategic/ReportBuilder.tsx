'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Save, Send, Loader2 } from 'lucide-react';
import { ReportScheduler, type Frequency, type ScheduleConfig } from './ReportScheduler';
import { ReportPreview } from './ReportPreview';
import { toast } from 'sonner';

export type ReportType = 'executive' | 'bsc' | 'actions' | 'kpis' | 'custom';

export interface ReportConfig {
  name: string;
  type: ReportType;
  sections: string[];
  frequency: Frequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  includePdf: boolean;
  sendCopy: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ReportConfig & { generateNow?: boolean }) => Promise<void>;
  initialConfig?: Partial<ReportConfig>;
}

const reportTypes = [
  { type: 'executive', icon: '📈', label: 'Executivo', description: 'Visão geral para diretoria' },
  { type: 'bsc', icon: '🎯', label: 'BSC', description: 'Balanced Scorecard completo' },
  { type: 'actions', icon: '✅', label: 'Ações', description: 'Status dos planos de ação' },
  { type: 'kpis', icon: '📊', label: 'KPIs', description: 'Análise detalhada de indicadores' },
];

const availableSections = [
  { key: 'summary', label: 'Resumo Executivo', default: true },
  { key: 'healthScore', label: 'Health Score e Tendência', default: true },
  { key: 'perspectives', label: 'KPIs por Perspectiva', default: true },
  { key: 'topActions', label: 'Top 5 Ações Prioritárias', default: true },
  { key: 'criticalKpis', label: 'Detalhamento de KPIs Críticos', default: false },
  { key: 'pdcaCycles', label: 'Ciclos PDCA em Andamento', default: false },
  { key: 'swotAnalysis', label: 'Análise SWOT', default: false },
  { key: 'achievements', label: 'Conquistas do Período', default: false },
];

// Default config factory
const getDefaultConfig = (initial?: Partial<ReportConfig>): ReportConfig => ({
  name: initial?.name || '',
  type: initial?.type || 'executive',
  sections: initial?.sections || availableSections.filter(s => s.default).map(s => s.key),
  frequency: initial?.frequency || 'weekly',
  dayOfWeek: initial?.dayOfWeek ?? 1,
  dayOfMonth: initial?.dayOfMonth ?? 1,
  time: initial?.time || '08:00',
  recipients: initial?.recipients || [],
  includePdf: initial?.includePdf ?? true,
  sendCopy: initial?.sendCopy ?? true,
});

export function ReportBuilder({ isOpen, onClose, onSave, initialConfig }: Props) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ReportConfig>(() => getDefaultConfig(initialConfig));

  // FIX Bug 2: Sincronizar config quando modal abre ou initialConfig muda
  useEffect(() => {
    if (isOpen) {
      // Reset para valores iniciais quando modal abre
      setConfig(getDefaultConfig(initialConfig));
      setStep(1);
      setError(null);
    }
  }, [isOpen, initialConfig]);

  const updateConfig = useCallback(<K extends keyof ReportConfig>(field: K, value: ReportConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(null); // Limpar erro ao editar
  }, []);

  const toggleSection = useCallback((key: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(key)
        ? prev.sections.filter(s => s !== key)
        : [...prev.sections, key],
    }));
  }, []);

  const handleSchedulerChange = useCallback((updates: Partial<ScheduleConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // FIX Bug 3: try-catch-finally completo com tratamento de erro
  const handleSave = useCallback(async (generateNow = false) => {
    // Validação antes de salvar
    if (!config.name.trim()) {
      setError('Nome do relatório é obrigatório');
      setStep(1);
      return;
    }

    if (config.sections.length === 0) {
      setError('Selecione pelo menos uma seção');
      setStep(1);
      return;
    }

    if (config.frequency !== 'manual' && config.recipients.length === 0) {
      setError('Adicione pelo menos um destinatário para agendamento automático');
      setStep(2);
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      await onSave({ ...config, generateNow });
      
      // Sucesso - fechar modal e resetar
      onClose();
      setStep(1);
      
    } catch (err) {
      // FIX Bug 3: Capturar e exibir erro
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar relatório';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Não fechar modal em caso de erro - usuário pode corrigir
      
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave, onClose]);

  const canProceed = useCallback(() => {
    if (step === 1) return config.name.trim() && config.type && config.sections.length > 0;
    if (step === 2) return config.frequency === 'manual' || config.recipients.length > 0;
    return true;
  }, [step, config]);

  const handleClose = useCallback(() => {
    if (isSaving) return; // Não fechar enquanto salva
    onClose();
    setStep(1);
    setError(null);
  }, [isSaving, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {initialConfig?.name ? 'Editar Relatório' : 'Novo Relatório'}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                      Etapa {step} de 3: {step === 1 ? 'Configuração' : step === 2 ? 'Agendamento' : 'Preview'}
                    </p>
                  </div>
                  <button 
                    onClick={handleClose} 
                    disabled={isSaving}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50 disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mt-4">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`flex-1 h-1 rounded-full transition-all ${
                        s <= step ? 'bg-purple-500' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 
                    text-red-400 text-sm flex items-center justify-between"
                >
                  <span>{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Step 1: Configuration */}
                {step === 1 && (
                  <div className="space-y-6">
                    {/* Name */}
                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Nome do Relatório *</label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => updateConfig('name', e.target.value)}
                        placeholder="Ex: Relatório Executivo Semanal"
                        disabled={isSaving}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                          text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50
                          disabled:opacity-50"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Tipo de Relatório</label>
                      <div className="grid grid-cols-4 gap-3">
                        {reportTypes.map(({ type, icon, label, description }) => (
                          <button
                            key={type}
                            onClick={() => updateConfig('type', type as ReportType)}
                            disabled={isSaving}
                            className={`p-4 rounded-xl border text-center transition-all disabled:opacity-50
                              ${config.type === type
                                ? 'bg-purple-500/20 border-purple-500/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                          >
                            <span className="text-2xl block mb-2">{icon}</span>
                            <p className="text-white font-medium text-sm">{label}</p>
                            <p className="text-white/40 text-xs mt-1">{description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Seções a incluir</label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableSections.map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => toggleSection(key)}
                            disabled={isSaving}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3
                              disabled:opacity-50
                              ${config.sections.includes(key)
                                ? 'bg-purple-500/20 border-purple-500/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                              ${config.sections.includes(key)
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-white/30'
                              }`}
                            >
                              {config.sections.includes(key) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="text-white text-sm">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Scheduling */}
                {step === 2 && (
                  <ReportScheduler
                    config={config}
                    onChange={handleSchedulerChange}
                  />
                )}

                {/* Step 3: Preview */}
                {step === 3 && (
                  <ReportPreview config={config} />
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-between">
                <div>
                  {step > 1 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white 
                        hover:bg-white/20 flex items-center gap-2 transition-colors
                        disabled:opacity-50"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 
                      transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  {step < 3 ? (
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={!canProceed() || isSaving}
                      className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                        hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      Próximo <ChevronRight size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-white/10 text-white 
                          hover:bg-white/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar
                      </button>
                      <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                          hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Gerar Agora
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
