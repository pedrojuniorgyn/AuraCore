"use client";

/**
 * FiveW2HWizard - Wizard para criação de planos de ação 5W2H
 * 
 * @module components/strategic
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, HelpCircle, MapPin, Calendar, Users, Wrench, DollarSign,
  ChevronLeft, ChevronRight, Save, Loader2
} from 'lucide-react';
import { WizardSteps, type WizardStepConfig } from './WizardStep';
import { toast } from 'sonner';

const STEPS: WizardStepConfig[] = [
  { id: 1, key: 'what', icon: <Target size={18} />, label: 'What', color: 'purple', question: 'O que será feito?' },
  { id: 2, key: 'why', icon: <HelpCircle size={18} />, label: 'Why', color: 'blue', question: 'Por que será feito?' },
  { id: 3, key: 'where', icon: <MapPin size={18} />, label: 'Where', color: 'green', question: 'Onde será executado?' },
  { id: 4, key: 'when', icon: <Calendar size={18} />, label: 'When', color: 'orange', question: 'Quando será feito?' },
  { id: 5, key: 'who', icon: <Users size={18} />, label: 'Who', color: 'pink', question: 'Quem será responsável?' },
  { id: 6, key: 'how', icon: <Wrench size={18} />, label: 'How', color: 'cyan', question: 'Como será feito?' },
  { id: 7, key: 'howMuch', icon: <DollarSign size={18} />, label: 'How Much', color: 'yellow', question: 'Quanto custará?' },
];

export interface FiveW2HFormData {
  what: string;
  why: string;
  where: string;
  department: string;
  branch: string;
  startDate: string;
  endDate: string;
  who: string[];
  how: string;
  howMuch: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  linkedObjective?: string;
}

interface OptionItem {
  id: string;
  name?: string;
  description?: string;
}

interface Props {
  onSubmit: (data: FiveW2HFormData) => Promise<void>;
  onCancel: () => void;
  objectives?: OptionItem[];
  users?: OptionItem[];
  departments?: OptionItem[];
  branches?: OptionItem[];
  initialData?: Partial<FiveW2HFormData>;
}

const PRIORITY_CONFIG = {
  LOW: { label: 'Baixa', bg: 'bg-blue-500/30', border: 'border-blue-500', text: 'text-blue-300' },
  MEDIUM: { label: 'Média', bg: 'bg-yellow-500/30', border: 'border-yellow-500', text: 'text-yellow-300' },
  HIGH: { label: 'Alta', bg: 'bg-orange-500/30', border: 'border-orange-500', text: 'text-orange-300' },
  CRITICAL: { label: 'Crítica', bg: 'bg-red-500/30', border: 'border-red-500', text: 'text-red-300' },
} as const;

export function FiveW2HWizard({
  onSubmit,
  onCancel,
  objectives = [],
  users = [],
  departments = [],
  branches = [],
  initialData = {}
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Não usar initialData aqui para evitar hydration mismatch
  // initialData pode mudar entre server render e client hydration
  // O useEffect abaixo irá sincronizar os valores quando necessário
  const [formData, setFormData] = useState<FiveW2HFormData>({
    what: '',
    why: '',
    where: '',
    department: '',
    branch: '',
    startDate: '',
    endDate: '',
    who: [],
    how: '',
    howMuch: 0,
    priority: 'MEDIUM',
    linkedObjective: undefined,
  });

  // Rastrear o último initialData aplicado para detectar mudanças reais
  const lastAppliedInitialDataRef = useRef<Partial<FiveW2HFormData>>({});

  // Rastrear quais campos o USUÁRIO editou manualmente (independente de initialData)
  const userEditedFieldsRef = useRef<Set<keyof FiveW2HFormData>>(new Set());

  // Atualizar formData quando initialData mudar, mas proteger edições do usuário
  useEffect(() => {
    // Se initialData não mudou desde a última aplicação, não fazer nada
    const hasInitialDataChanged = JSON.stringify(lastAppliedInitialDataRef.current) !== JSON.stringify(initialData);
    if (!hasInitialDataChanged) {
      return;
    }

    // Atualizar ref ANTES de qualquer return, para manter consistência
    lastAppliedInitialDataRef.current = { ...initialData };

    // Se initialData está vazio, apenas atualizar ref e não modificar form
    if (Object.keys(initialData).length === 0) {
      return;
    }

    setFormData(prev => {
      // FIX Bug 1: Verificar se campo foi editado ANTES de deletar do ref
      // A ordem correta é: verificar → aplicar → deletar (apenas não-editados)
      // Ordem ERRADA era: deletar → verificar → aplicar (perdia edições do usuário)
      const isFieldEdited = (field: keyof FiveW2HFormData): boolean => {
        return userEditedFieldsRef.current.has(field);
      };

      // Verificar quais campos foram editados pelo usuário
      const edited = {
        what: isFieldEdited('what'),
        why: isFieldEdited('why'),
        where: isFieldEdited('where'),
        department: isFieldEdited('department'),
        branch: isFieldEdited('branch'),
        startDate: isFieldEdited('startDate'),
        endDate: isFieldEdited('endDate'),
        who: isFieldEdited('who'),
        how: isFieldEdited('how'),
        howMuch: isFieldEdited('howMuch'),
        priority: isFieldEdited('priority'),
        linkedObjective: isFieldEdited('linkedObjective'),
      };

      // Limpar marcadores de edição APENAS para campos que NÃO foram editados pelo usuário
      // e que estão presentes no novo initialData
      // Isso permite que esses campos sejam sobrescritos por futuros initialData
      Object.keys(initialData).forEach((key) => {
        const fieldKey = key as keyof FiveW2HFormData;
        if (!edited[fieldKey]) {
          userEditedFieldsRef.current.delete(fieldKey);
        }
      });

      // Usar ?? (nullish coalescing) em vez de || (logical OR)
      // ?? só descarta null/undefined, || descarta qualquer valor falsy (empty string, 0, [])
      // Aplicar initialData apenas em campos que o usuário NÃO editou
      return {
        what: edited.what ? prev.what : (initialData.what ?? prev.what),
        why: edited.why ? prev.why : (initialData.why ?? prev.why),
        where: edited.where ? prev.where : (initialData.where ?? prev.where),
        department: edited.department ? prev.department : (initialData.department ?? prev.department),
        branch: edited.branch ? prev.branch : (initialData.branch ?? prev.branch),
        startDate: edited.startDate ? prev.startDate : (initialData.startDate ?? prev.startDate),
        endDate: edited.endDate ? prev.endDate : (initialData.endDate ?? prev.endDate),
        who: edited.who ? prev.who : (initialData.who ?? prev.who),
        how: edited.how ? prev.how : (initialData.how ?? prev.how),
        howMuch: edited.howMuch ? prev.howMuch : (initialData.howMuch ?? prev.howMuch),
        priority: edited.priority ? prev.priority : (initialData.priority ?? prev.priority),
        linkedObjective: edited.linkedObjective ? prev.linkedObjective : (initialData.linkedObjective ?? prev.linkedObjective),
      };
    });
  }, [initialData]);

  const step = STEPS[currentStep];

  const updateField = <K extends keyof FiveW2HFormData>(
    field: K,
    value: FiveW2HFormData[K]
  ) => {
    // Marcar campo como editado pelo usuário IMEDIATAMENTE
    // Isso protege contra sobrescrita futura de initialData
    userEditedFieldsRef.current.add(field);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (step.key) {
      case 'what': return formData.what.trim().length >= 10;
      case 'why': return formData.why.trim().length >= 10;
      case 'where': return formData.where.trim().length >= 5 || Boolean(formData.department);
      case 'when': return Boolean(formData.startDate) && Boolean(formData.endDate);
      case 'who': return formData.who.length > 0;
      case 'how': return formData.how.trim().length >= 10;
      case 'howMuch': return true; // Opcional
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Plano de ação criado com sucesso!');
    } catch {
      toast.error('Erro ao criar plano de ação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const stepColorClass = {
      purple: 'bg-purple-500/20',
      blue: 'bg-blue-500/20',
      green: 'bg-green-500/20',
      orange: 'bg-orange-500/20',
      pink: 'bg-pink-500/20',
      cyan: 'bg-cyan-500/20',
      yellow: 'bg-yellow-500/20',
    }[step.color] || 'bg-purple-500/20';

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Step Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${stepColorClass}`}>
              {step.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{step.label}</h2>
              <p className="text-white/60">{step.question}</p>
            </div>
          </div>

          {/* Step Content */}
          {step.key === 'what' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Descrição da ação *</label>
                <textarea
                  value={formData.what}
                  onChange={(e) => updateField('what', e.target.value)}
                  placeholder="Descreva claramente o que será realizado..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                    text-white placeholder-white/30 resize-none
                    focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <p className="text-xs text-white/40 mt-1">{formData.what.length}/200 caracteres (mín. 10)</p>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Prioridade</label>
                <div className="flex gap-2">
                  {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => {
                    const config = PRIORITY_CONFIG[p];
                    const isSelected = formData.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateField('priority', p)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border
                          ${isSelected 
                            ? `${config.bg} ${config.border} ${config.text}` 
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {objectives.length > 0 && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Vincular a objetivo (opcional)</label>
                  <select
                    value={formData.linkedObjective || ''}
                    onChange={(e) => updateField('linkedObjective', e.target.value || undefined)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {objectives.map(o => (
                      <option key={o.id} value={o.id}>{o.description || o.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step.key === 'why' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Justificativa *</label>
              <textarea
                value={formData.why}
                onChange={(e) => updateField('why', e.target.value)}
                placeholder="Explique a razão e os benefícios esperados..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                  text-white placeholder-white/30 resize-none
                  focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-xs text-white/40 mt-1">{formData.why.length} caracteres (mín. 10)</p>
            </div>
          )}

          {step.key === 'where' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Local / Área</label>
                <input
                  type="text"
                  value={formData.where}
                  onChange={(e) => updateField('where', e.target.value)}
                  placeholder="Descreva o local de execução..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                    text-white placeholder-white/30
                    focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Departamento</label>
                  <select
                    value={formData.department}
                    onChange={(e) => updateField('department', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Filial</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => updateField('branch', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step.key === 'when' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Data Início *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white focus:outline-none focus:border-purple-500/50 transition-colors
                      [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Data Fim *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    min={formData.startDate}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white focus:outline-none focus:border-purple-500/50 transition-colors
                      [color-scheme:dark]"
                  />
                </div>
              </div>
              {formData.startDate && formData.endDate && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-blue-300 text-sm">
                    📅 Duração: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} dias
                  </p>
                </div>
              )}
            </div>
          )}

          {step.key === 'who' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Responsáveis *</label>
              {users.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {users.map(user => {
                      const isSelected = formData.who.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            updateField('who', isSelected 
                              ? formData.who.filter(id => id !== user.id)
                              : [...formData.who, user.id]
                            );
                          }}
                          className={`p-3 rounded-xl text-left transition-all border
                            ${isSelected
                              ? 'bg-purple-500/20 border-purple-500/50 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                        >
                          <span>{user.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/40 mt-2">{formData.who.length} selecionado(s)</p>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ Nenhum usuário disponível. Configure os usuários do sistema primeiro.
                  </p>
                </div>
              )}
            </div>
          )}

          {step.key === 'how' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Metodologia / Passos *</label>
              <textarea
                value={formData.how}
                onChange={(e) => updateField('how', e.target.value)}
                placeholder="Descreva como a ação será executada, etapas, recursos necessários..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                  text-white placeholder-white/30 resize-none
                  focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-xs text-white/40 mt-1">{formData.how.length} caracteres (mín. 10)</p>
            </div>
          )}

          {step.key === 'howMuch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Orçamento Estimado (R$)</label>
                <input
                  type="number"
                  value={formData.howMuch || ''}
                  onChange={(e) => updateField('howMuch', Number(e.target.value))}
                  placeholder="0,00"
                  min="0"
                  step="100"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                    text-white placeholder-white/30
                    focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 text-sm">
                  💡 Este campo é opcional. Se não souber o valor exato, deixe em branco ou estime.
                </p>
              </div>

              {/* Resumo Final */}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-white font-semibold mb-3">📋 Resumo do Plano</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-white/50">O quê:</span> <span className="text-white">{formData.what.substring(0, 50)}...</span></p>
                  <p><span className="text-white/50">Prioridade:</span> <span className={PRIORITY_CONFIG[formData.priority].text}>{PRIORITY_CONFIG[formData.priority].label}</span></p>
                  <p><span className="text-white/50">Período:</span> <span className="text-white">{formData.startDate} a {formData.endDate}</span></p>
                  <p><span className="text-white/50">Responsáveis:</span> <span className="text-white">{formData.who.length} pessoa(s)</span></p>
                  {formData.howMuch > 0 && (
                    <p><span className="text-white/50">Orçamento:</span> <span className="text-white">R$ {formData.howMuch.toLocaleString('pt-BR')}</span></p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Steps */}
      <WizardSteps 
        steps={STEPS} 
        currentStep={currentStep} 
        onStepClick={setCurrentStep}
      />

      {/* Content */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={currentStep === 0 ? onCancel : handleBack}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 
            text-white flex items-center gap-2 hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} />
          {currentStep === 0 ? 'Cancelar' : 'Voltar'}
        </button>

        {currentStep === STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500
              text-white flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25
              disabled:opacity-50 transition-all"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Criar Plano de Ação
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-3 rounded-xl bg-purple-500 text-white 
              flex items-center gap-2 hover:bg-purple-600
              disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Próximo
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
