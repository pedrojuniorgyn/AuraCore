'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Building2, User, X } from 'lucide-react';
import type { OKR, OKRLevel } from '@/lib/okrs/okr-types';
import { LEVEL_LABELS, PERIOD_PRESETS } from '@/lib/okrs/okr-types';

interface Props {
  okr?: Partial<OKR>;
  parentOKR?: OKR;
  onSubmit: (data: Partial<OKR>) => Promise<void>;
  onCancel: () => void;
}

const levelIcons: Record<OKRLevel, React.ElementType> = {
  corporate: Building2,
  department: Building2,
  team: Users,
  individual: User,
};

export function OKRForm({ okr, parentOKR, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(okr?.title || '');
  const [description, setDescription] = useState(okr?.description || '');
  const [level, setLevel] = useState<OKRLevel>(
    okr?.level || (parentOKR ? getChildLevel(parentOKR.level) : 'corporate')
  );
  const [periodLabel, setPeriodLabel] = useState(okr?.periodLabel || 'Q1-2026');
  const [ownerId, setOwnerId] = useState(okr?.ownerId || '');
  const [ownerName, setOwnerName] = useState(okr?.ownerName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getChildLevel(parentLevel: OKRLevel): OKRLevel {
    const levels: OKRLevel[] = ['corporate', 'department', 'team', 'individual'];
    const index = levels.indexOf(parentLevel);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const period = PERIOD_PRESETS.find((p) => p.value === periodLabel);

    try {
      await onSubmit({
        title,
        description: description || undefined,
        level,
        parentId: parentOKR?.id,
        periodType:
          periodLabel.startsWith('Q')
            ? 'quarter'
            : periodLabel.startsWith('H')
              ? 'semester'
              : 'year',
        periodLabel,
        startDate: period ? new Date(period.start) : new Date(),
        endDate: period ? new Date(period.end) : new Date(),
        ownerId,
        ownerName,
        ownerType: level === 'individual' ? 'user' : level === 'team' ? 'team' : 'department',
        status: 'draft',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-white/5 rounded-2xl border border-white/10 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Target className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-white font-semibold">
              {okr?.id ? 'Editar OKR' : 'Novo OKR'}
            </h2>
            {parentOKR && (
              <p className="text-white/40 text-sm">Alinhado com: {parentOKR.title}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-white/10 text-white/40"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-sm mb-2 block">Título do Objetivo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Aumentar eficiência operacional em 20%"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30
              focus:outline-none focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="text-white/60 text-sm mb-2 block">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o objetivo e seu contexto..."
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30 resize-none
              focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">Nível</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LEVEL_LABELS) as OKRLevel[]).map((l) => {
                const Icon = levelIcons[l];
                const isDisabled =
                  parentOKR &&
                  ['corporate', 'department', 'team', 'individual'].indexOf(l) <=
                    ['corporate', 'department', 'team', 'individual'].indexOf(parentOKR.level);

                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => !isDisabled && setLevel(l)}
                    disabled={isDisabled}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors
                      ${
                        level === l
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : isDisabled
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                  >
                    <Icon size={14} />
                    <span>{LEVEL_LABELS[l]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">Período</label>
            <select
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value} className="bg-gray-900">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">ID do Responsável</label>
            <input
              type="text"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="user-123"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Nome do Responsável</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="João Silva"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
            hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title || !ownerId || !ownerName || isSubmitting}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white 
            hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : okr?.id ? 'Salvar' : 'Criar OKR'}
        </button>
      </div>
    </motion.form>
  );
}
