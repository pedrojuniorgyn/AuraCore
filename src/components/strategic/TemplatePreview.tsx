"use client";

/**
 * TemplatePreview - Modal de preview de template
 * 
 * @module components/strategic
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Tag, User, CheckSquare, Rocket } from 'lucide-react';

export interface TemplateStructure {
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  how: string[];
  howMuch: string;
}

export interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rating: number;
  usageCount: number;
  createdBy: { name: string };
  structure: TemplateStructure;
  suggestedTasks: { id: string; title: string; description?: string }[];
}

interface Props {
  template: TemplateDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onUse: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  logistics: 'Logística',
  financial: 'Financeiro',
  commercial: 'Comercial',
  hr: 'RH',
  quality: 'Qualidade',
  general: 'Geral',
};

export function TemplatePreview({ template, isOpen, onClose, onUse }: Props) {
  if (!template) return null;

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
              w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
              shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 
                      flex items-center justify-center text-3xl">
                      {template.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{template.name}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm flex-wrap">
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Star size={14} className="fill-current" />
                          {template.rating.toFixed(1)} ({template.usageCount} usos)
                        </span>
                        <span className="flex items-center gap-1 text-white/50">
                          <Tag size={14} />
                          {categoryLabels[template.category] || template.category}
                        </span>
                        <span className="flex items-center gap-1 text-white/50">
                          <User size={14} />
                          {template.createdBy.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    📝 Descrição
                  </h3>
                  <p className="text-white/70">{template.description}</p>
                </div>

                {/* 5W2H Structure */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    📋 Estrutura do Plano (5W2H)
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'what', label: 'WHAT (O quê)', icon: '🎯', colorClass: 'text-purple-400' },
                      { key: 'why', label: 'WHY (Por quê)', icon: '❓', colorClass: 'text-blue-400' },
                      { key: 'where', label: 'WHERE (Onde)', icon: '📍', colorClass: 'text-green-400' },
                      { key: 'when', label: 'WHEN (Quando)', icon: '📅', colorClass: 'text-orange-400' },
                      { key: 'who', label: 'WHO (Quem)', icon: '👥', colorClass: 'text-pink-400' },
                      { key: 'howMuch', label: 'HOW MUCH (Quanto)', icon: '💰', colorClass: 'text-yellow-400' },
                    ].map(({ key, label, icon, colorClass }) => (
                      <div key={key} className="flex items-start gap-3">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <span className={`${colorClass} font-medium text-sm`}>{label}</span>
                          <p className="text-white/70 text-sm mt-1">
                            {template.structure[key as keyof TemplateStructure] || '[A definir]'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* HOW (special - array) */}
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🔧</span>
                      <div>
                        <span className="text-cyan-400 font-medium text-sm">HOW (Como)</span>
                        <ul className="text-white/70 text-sm mt-1 space-y-1">
                          {template.structure.how.length > 0 ? (
                            template.structure.how.map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-white/30">•</span>
                                {step}
                              </li>
                            ))
                          ) : (
                            <li className="text-white/40">[A definir]</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Tasks */}
                {template.suggestedTasks.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <CheckSquare size={18} className="text-green-400" />
                      Tarefas Sugeridas ({template.suggestedTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {template.suggestedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                        >
                          <div className="w-5 h-5 rounded border-2 border-white/20" />
                          <div>
                            <p className="text-white text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-white/50 text-xs">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-white/10 text-white 
                    hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onUse(template.id)}
                  className="px-6 py-2 rounded-xl bg-purple-500 text-white 
                    hover:bg-purple-600 transition-all flex items-center gap-2"
                >
                  <Rocket size={18} /> Usar Este Template
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
