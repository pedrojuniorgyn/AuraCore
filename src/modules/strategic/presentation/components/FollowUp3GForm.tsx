'use client';

/**
 * Componente: FollowUp3GForm
 * Formulário de Follow-up 3G (GEMBA/GEMBUTSU/GENJITSU)
 * 
 * @module strategic/presentation/components
 */
import { useState } from 'react';

interface FollowUp3GFormProps {
  actionPlanId: string;
  actionPlanCode: string;
  onSubmit: (data: FollowUpData) => Promise<void>;
  onCancel: () => void;
}

interface FollowUpData {
  followUpDate: Date;
  gembaLocal: string;
  gembutsuObservation: string;
  genjitsuData: string;
  executionStatus: string;
  executionPercent: number;
  problemsObserved?: string;
  problemSeverity?: string;
  requiresNewPlan: boolean;
  newPlanDescription?: string;
  evidenceUrls?: string[];
}

export function FollowUp3GForm({
  actionPlanCode,
  onSubmit,
  onCancel,
}: FollowUp3GFormProps) {
  const [formData, setFormData] = useState<FollowUpData>({
    followUpDate: new Date(),
    gembaLocal: '',
    gembutsuObservation: '',
    genjitsuData: '',
    executionStatus: 'EXECUTED_OK',
    executionPercent: 100,
    requiresNewPlan: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          🔍 Follow-up 3G - {actionPlanCode}
        </h2>

        {/* Callout 3G */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">
            Metodologia 3G (三現主義)
          </h3>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li><strong>GEMBA (現場)</strong>: Vá ao local onde acontece</li>
            <li><strong>GEMBUTSU (現物)</strong>: Observe o objeto/processo real</li>
            <li><strong>GENJITSU (現実)</strong>: Baseie-se em fatos e dados</li>
          </ul>
        </div>

        {/* GEMBA */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 GEMBA - Onde você verificou? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Galpão 3 - Área de expedição, Doca 5"
            value={formData.gembaLocal}
            onChange={(e) => setFormData({ ...formData, gembaLocal: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* GEMBUTSU */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            👁️ GEMBUTSU - O que você observou? <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Descreva o que você viu no local. Ex: Sistema de etiquetas funcionando, 8 de 10 operadores treinados..."
            value={formData.gembutsuObservation}
            onChange={(e) => setFormData({ ...formData, gembutsuObservation: e.target.value })}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* GENJITSU */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 GENJITSU - Quais dados/fatos você coletou? <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Dados concretos. Ex: Taxa de erro: 2.3%, Tempo médio: 45min, 15 pedidos verificados..."
            value={formData.genjitsuData}
            onChange={(e) => setFormData({ ...formData, genjitsuData: e.target.value })}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <hr className="my-6" />

        {/* Status de Execução */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status da Execução
            </label>
            <select
              value={formData.executionStatus}
              onChange={(e) => setFormData({ ...formData, executionStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="EXECUTED_OK">✅ Executado OK</option>
              <option value="EXECUTED_PARTIAL">⚠️ Executado Parcialmente</option>
              <option value="NOT_EXECUTED">❌ Não Executado</option>
              <option value="BLOCKED">🚫 Bloqueado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Percentual de Execução
            </label>
            <input
              type="number"
              value={formData.executionPercent}
              onChange={(e) => setFormData({ ...formData, executionPercent: parseInt(e.target.value, 10) || 0 })}
              min={0}
              max={100}
              step={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Problemas (se não executado OK) */}
        {formData.executionStatus !== 'EXECUTED_OK' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problemas Observados
              </label>
              <textarea
                placeholder="Descreva os problemas encontrados..."
                value={formData.problemsObserved ?? ''}
                onChange={(e) => setFormData({ ...formData, problemsObserved: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severidade do Problema
              </label>
              <select
                value={formData.problemSeverity ?? 'MEDIUM'}
                onChange={(e) => setFormData({ ...formData, problemSeverity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>

            {/* Reproposição */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresNewPlan}
                  onChange={(e) => setFormData({ ...formData, requiresNewPlan: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  🔄 Requer novo plano de ação (reproposição)
                </span>
              </label>
            </div>

            {formData.requiresNewPlan && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Novo Plano
                </label>
                <textarea
                  placeholder="O que precisa ser feito no novo plano..."
                  value={formData.newPlanDescription ?? ''}
                  onChange={(e) => setFormData({ ...formData, newPlanDescription: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Salvando...
              </>
            ) : (
              <>
                💾 Registrar Follow-up
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
