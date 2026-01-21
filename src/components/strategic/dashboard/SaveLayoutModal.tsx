'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Globe, Users, Lock } from 'lucide-react';
import type { DashboardVisibility } from '@/lib/dashboard/dashboard-types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    visibility: DashboardVisibility;
    isDefault: boolean;
  }) => void;
  initialName?: string;
  initialDescription?: string;
  isNewDashboard?: boolean;
}

export function SaveLayoutModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  isNewDashboard = false,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState<DashboardVisibility>('private');
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name, description, visibility, isDefault });
    onClose();
  };

  const visibilityOptions = [
    { value: 'private' as const, label: 'Privado', desc: 'Apenas eu', icon: Lock },
    { value: 'team' as const, label: 'Time', desc: 'Meu departamento', icon: Users },
    { value: 'public' as const, label: 'Público', desc: 'Toda organização', icon: Globe },
  ];

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
              <h2 className="text-white font-semibold">
                {isNewDashboard ? 'Novo Dashboard' : 'Salvar Layout'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Nome do Dashboard *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dashboard Executivo Q1 2026"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white placeholder:text-white/30
                    focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Visão geral dos principais KPIs..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white placeholder:text-white/30
                    focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Visibilidade</label>
                <div className="space-y-2">
                  {visibilityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer
                          border transition-colors
                          ${visibility === option.value ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'}`}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={option.value}
                          checked={visibility === option.value}
                          onChange={(e) =>
                            setVisibility(e.target.value as DashboardVisibility)
                          }
                          className="hidden"
                        />
                        <Icon
                          size={18}
                          className={
                            visibility === option.value ? 'text-purple-400' : 'text-white/40'
                          }
                        />
                        <div>
                          <span
                            className={`block font-medium ${visibility === option.value ? 'text-white' : 'text-white/70'}`}
                          >
                            {option.label}
                          </span>
                          <span className="text-white/40 text-sm">{option.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Default */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 
                    text-purple-500 focus:ring-purple-500"
                />
                <span className="text-white/80 text-sm">Definir como meu dashboard padrão</span>
              </label>
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
                disabled={!name.trim()}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white 
                  hover:bg-purple-600 transition-colors disabled:opacity-50 
                  disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                Salvar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
