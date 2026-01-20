"use client";

/**
 * TemplateEditor - Modal de criação/edição de template
 * 
 * @module components/strategic
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import type { TemplateStructure } from './TemplatePreview';

export interface TemplateData {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  structure: TemplateStructure;
  suggestedTasks: { id: string; title: string }[];
}

interface Props {
  template?: TemplateData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateData) => Promise<void>;
}

const categoryOptions = [
  { value: 'logistics', label: 'Logística', icon: '🚚' },
  { value: 'financial', label: 'Financeiro', icon: '💰' },
  { value: 'commercial', label: 'Comercial', icon: '👥' },
  { value: 'hr', label: 'RH', icon: '🧑‍💼' },
  { value: 'quality', label: 'Qualidade', icon: '✅' },
  { value: 'general', label: 'Geral', icon: '📋' },
];

const iconOptions = ['🎯', '🚀', '💡', '📊', '🔧', '📈', '🏆', '⚡', '🔍', '📦', '🚚', '💰', '👥', '✅'];

const emptyTemplate: TemplateData = {
  name: '',
  description: '',
  icon: '🎯',
  category: 'general',
  structure: {
    what: '',
    why: '',
    where: '',
    when: '',
    who: '',
    how: [],
    howMuch: '',
  },
  suggestedTasks: [],
};

export function TemplateEditor({ template, isOpen, onClose, onSave }: Props) {
  const [data, setData] = useState<TemplateData>(emptyTemplate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setData(template);
    } else {
      setData(emptyTemplate);
    }
  }, [template, isOpen]);

  const updateField = <K extends keyof TemplateData>(field: K, value: TemplateData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateStructure = <K extends keyof TemplateStructure>(field: K, value: TemplateStructure[K]) => {
    setData(prev => ({
      ...prev,
      structure: { ...prev.structure, [field]: value },
    }));
  };

  const addHowStep = () => {
    setData(prev => ({
      ...prev,
      structure: { ...prev.structure, how: [...prev.structure.how, ''] },
    }));
  };

  const updateHowStep = (index: number, value: string) => {
    const newHow = [...data.structure.how];
    newHow[index] = value;
    updateStructure('how', newHow);
  };

  const removeHowStep = (index: number) => {
    updateStructure('how', data.structure.how.filter((_, i) => i !== index));
  };

  const addTask = () => {
    setData(prev => ({
      ...prev,
      suggestedTasks: [...prev.suggestedTasks, { id: crypto.randomUUID(), title: '' }],
    }));
  };

  const updateTask = (id: string, title: string) => {
    setData(prev => ({
      ...prev,
      suggestedTasks: prev.suggestedTasks.map(t => t.id === id ? { ...t, title } : t),
    }));
  };

  const removeTask = (id: string) => {
    setData(prev => ({
      ...prev,
      suggestedTasks: prev.suggestedTasks.filter(t => t.id !== id),
    }));
  };

  const handleSave = async () => {
    if (!data.name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(data);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

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
              w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {template?.id ? 'Editar Template' : 'Novo Template'}
                </h2>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-white/60 text-sm mb-2 block">Nome do Template *</label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Ex: Melhoria de OTD"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                        text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Ícone</label>
                    <div className="flex flex-wrap gap-2">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => updateField('icon', icon)}
                          className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center
                            ${data.icon === icon 
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                            } border transition-all`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Categoria</label>
                    <select
                      value={data.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                        text-white focus:outline-none focus:border-purple-500/50"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-gray-900">
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-white/60 text-sm mb-2 block">Descrição</label>
                    <textarea
                      value={data.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Descreva o objetivo deste template..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                        text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* 5W2H Structure */}
                <div>
                  <h3 className="text-white font-bold mb-4">Estrutura 5W2H</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'what' as const, label: 'WHAT (O quê)', placeholder: 'O que será feito...' },
                      { key: 'why' as const, label: 'WHY (Por quê)', placeholder: 'Justificativa...' },
                      { key: 'where' as const, label: 'WHERE (Onde)', placeholder: 'Local/Área...' },
                      { key: 'who' as const, label: 'WHO (Quem)', placeholder: 'Responsáveis...' },
                      { key: 'howMuch' as const, label: 'HOW MUCH (Quanto)', placeholder: 'Orçamento...' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-white/60 text-sm mb-1 block">{label}</label>
                        <input
                          type="text"
                          value={data.structure[key]}
                          onChange={(e) => updateStructure(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 
                            text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    ))}

                    {/* HOW - multiple steps */}
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">HOW (Como) - Passos</label>
                      <div className="space-y-2">
                        {data.structure.how.map((step, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={step}
                              onChange={(e) => updateHowStep(i, e.target.value)}
                              placeholder={`Passo ${i + 1}...`}
                              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 
                                text-white placeholder-white/30 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeHowStep(i)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addHowStep}
                          className="w-full py-2 rounded-lg border border-dashed border-white/20 
                            text-white/50 hover:bg-white/5 flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> Adicionar Passo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Tasks */}
                <div>
                  <h3 className="text-white font-bold mb-4">Tarefas Sugeridas</h3>
                  <div className="space-y-2">
                    {data.suggestedTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTask(task.id, e.target.value)}
                          placeholder="Título da tarefa..."
                          className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTask}
                      className="w-full py-2 rounded-lg border border-dashed border-white/20 
                        text-white/50 hover:bg-white/5 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Adicionar Tarefa
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!data.name.trim() || isSaving}
                  className="px-6 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 
                    flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
