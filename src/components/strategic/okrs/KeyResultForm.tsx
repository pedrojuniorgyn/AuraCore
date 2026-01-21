'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, X, Link as LinkIcon } from 'lucide-react';
import type { KeyResult } from '@/lib/okrs/okr-types';

interface Props {
  keyResult?: Partial<KeyResult>;
  okrId: string;
  onSubmit: (data: Partial<KeyResult>) => Promise<void>;
  onCancel: () => void;
}

export function KeyResultForm({ keyResult, okrId, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(keyResult?.title || '');
  const [description, setDescription] = useState(keyResult?.description || '');
  const [metricType, setMetricType] = useState<KeyResult['metricType']>(
    keyResult?.metricType || 'number'
  );
  const [startValue, setStartValue] = useState(keyResult?.startValue?.toString() || '0');
  const [targetValue, setTargetValue] = useState(keyResult?.targetValue?.toString() || '100');
  const [currentValue, setCurrentValue] = useState(keyResult?.currentValue?.toString() || '0');
  const [unit, setUnit] = useState(keyResult?.unit || '');
  const [weight, setWeight] = useState(keyResult?.weight?.toString() || '100');
  const [linkedKpiId, setLinkedKpiId] = useState(keyResult?.linkedKpiId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const start = parseFloat(startValue);
    const target = parseFloat(targetValue);
    const current = parseFloat(currentValue);
    const range = target - start;
    const progress = range === 0 ? (current >= target ? 100 : 0) : 
      Math.max(0, Math.min(100, Math.round(((current - start) / range) * 100)));

    try {
      await onSubmit({
        title,
        description: description || undefined,
        metricType,
        startValue: start,
        targetValue: target,
        currentValue: current,
        unit: unit || undefined,
        weight: parseInt(weight) || 100,
        progress,
        status: progress >= 100 ? 'completed' : progress === 0 ? 'not_started' : 
          progress >= 70 ? 'on_track' : progress >= 40 ? 'at_risk' : 'behind',
        linkedKpiId: linkedKpiId || undefined,
        okrId,
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Target className="text-blue-400" size={20} />
          </div>
          <h2 className="text-white font-semibold">
            {keyResult?.id ? 'Editar Key Result' : 'Novo Key Result'}
          </h2>
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
          <label className="text-white/60 text-sm mb-2 block">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Reduzir custo por entrega em 15%"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30
              focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-white/60 text-sm mb-2 block">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Como será medido este Key Result..."
            rows={2}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30 resize-none
              focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">Tipo de Métrica</label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as KeyResult['metricType'])}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="number" className="bg-gray-900">Número</option>
              <option value="percentage" className="bg-gray-900">Percentual</option>
              <option value="currency" className="bg-gray-900">Moeda (R$)</option>
              <option value="boolean" className="bg-gray-900">Sim/Não</option>
            </select>
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Unidade (opcional)</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex: entregas, km, dias"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">Valor Inicial</label>
            <input
              type="number"
              step="0.01"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Valor Atual</label>
            <input
              type="number"
              step="0.01"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Meta</label>
            <input
              type="number"
              step="0.01"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-white/60 text-sm mb-2 block">Peso (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white focus:outline-none focus:border-blue-500"
            required
          />
          <p className="text-white/40 text-xs mt-1">
            O peso define a importância deste KR no cálculo do progresso do OKR
          </p>
        </div>

        <div>
          <label className="text-white/60 text-sm mb-2 block flex items-center gap-2">
            <LinkIcon size={14} />
            Vincular a KPI (opcional)
          </label>
          <input
            type="text"
            value={linkedKpiId}
            onChange={(e) => setLinkedKpiId(e.target.value)}
            placeholder="ID do KPI para sincronização automática"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30
              focus:outline-none focus:border-blue-500"
          />
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
          disabled={!title || isSubmitting}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white 
            hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : keyResult?.id ? 'Salvar' : 'Adicionar KR'}
        </button>
      </div>
    </motion.form>
  );
}
