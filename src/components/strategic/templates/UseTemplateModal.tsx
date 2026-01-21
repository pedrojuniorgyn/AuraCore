'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import type { Template, UseTemplateResult } from '@/lib/templates/template-types';

interface UseTemplateModalProps {
  template: Template;
  onClose: () => void;
  onUse: (variables: Record<string, unknown>) => Promise<UseTemplateResult>;
}

function UseTemplateModalInner({ template, onClose, onUse }: UseTemplateModalProps) {
  const [variables, setVariables] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    template.variables?.forEach((v) => {
      if (v.defaultValue !== undefined) {
        initial[v.name] = v.defaultValue;
      }
    });
    return initial;
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(template.items?.map((i) => i.id) || [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<UseTemplateResult | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await onUse(variables);
      setResult(res);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const totalItems = template.items?.length || template.metadata?.itemCount || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-gray-900 rounded-2xl 
          border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon || '📋'}</span>
            <div>
              <h2 className="text-white font-bold text-lg">Usar Template</h2>
              <p className="text-white/60 text-sm">{template.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 
              hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {result ? (
            // Success state
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-xl mb-2">
                Template Aplicado!
              </h3>
              <p className="text-white/60 mb-4">
                {result.createdItems.length} item(s) criado(s) com sucesso.
              </p>
              <ul className="text-left bg-white/5 rounded-xl p-4 space-y-2">
                {result.createdItems.map((item) => (
                  <li key={item.id} className="text-white/80 text-sm flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-white/80 text-sm">
                  Este template criará{' '}
                  <span className="text-purple-400 font-semibold">
                    {selectedItems.size} de {totalItems}
                  </span>{' '}
                  itens.
                </p>
              </div>

              {/* Items to create */}
              {template.items && template.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">
                    Itens a criar:
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {template.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg 
                          hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="w-4 h-4 rounded border-white/20 
                            text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white/80 text-sm">{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables */}
              {template.variables && template.variables.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Personalizar:</h4>
                  {template.variables.map((variable) => (
                    <div key={variable.id}>
                      <label className="block text-white/70 text-sm mb-1">
                        {variable.label}
                        {variable.required && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </label>
                      {variable.type === 'text' && (
                        <input
                          type="text"
                          value={(variables[variable.name] as string) || ''}
                          onChange={(e) =>
                            setVariables((prev) => ({
                              ...prev,
                              [variable.name]: e.target.value,
                            }))
                          }
                          placeholder={variable.placeholder}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 
                            rounded-lg text-white placeholder:text-white/30
                            focus:outline-none focus:border-purple-500"
                        />
                      )}
                      {variable.type === 'date' && (
                        <input
                          type="date"
                          value={(variables[variable.name] as string) || ''}
                          onChange={(e) =>
                            setVariables((prev) => ({
                              ...prev,
                              [variable.name]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 
                            rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      )}
                      {variable.type === 'number' && (
                        <input
                          type="number"
                          value={(variables[variable.name] as number) || ''}
                          onChange={(e) =>
                            setVariables((prev) => ({
                              ...prev,
                              [variable.name]: parseFloat(e.target.value),
                            }))
                          }
                          placeholder={variable.placeholder}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 
                            rounded-lg text-white placeholder:text-white/30
                            focus:outline-none focus:border-purple-500"
                        />
                      )}
                      {variable.type === 'select' && variable.options && (
                        <select
                          value={(variables[variable.name] as string) || ''}
                          onChange={(e) =>
                            setVariables((prev) => ({
                              ...prev,
                              [variable.name]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 
                            rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="" className="bg-gray-900">
                            Selecione...
                          </option>
                          {variable.options.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-gray-900">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white transition-colors"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedItems.size === 0}
              className="px-6 py-2 bg-purple-500 text-white rounded-xl 
                hover:bg-purple-600 transition-colors flex items-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando...
                </>
              ) : (
                `Criar ${selectedItems.size} item(s)`
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export const UseTemplateModal = memo(UseTemplateModalInner);
