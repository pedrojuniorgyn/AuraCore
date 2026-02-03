'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';

const UNITS = [
  { value: 'PERCENTAGE', label: 'Percentual (%)', symbol: '%' },
  { value: 'CURRENCY', label: 'Moeda (R$)', symbol: 'R$' },
  { value: 'NUMBER', label: 'Número', symbol: '#' },
  { value: 'DAYS', label: 'Dias', symbol: 'd' },
  { value: 'HOURS', label: 'Horas', symbol: 'h' },
  { value: 'UNITS', label: 'Unidades', symbol: 'un' },
];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
];

export default function EditKPIPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'PERCENTAGE',
    frequency: 'MONTHLY',
    targetValue: 0,
    polarity: 'UP' as 'UP' | 'DOWN',
  });

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const data = await fetchAPI<{ id: string; code: string; name: string; description?: string; unit: string; frequency: string; targetValue: number; polarity: string }>(`/api/strategic/kpis/${id}`);
        setFormData({
          code: data.code || '',
          name: data.name || '',
          description: data.description || '',
          unit: data.unit || 'PERCENTAGE',
          frequency: data.frequency || 'MONTHLY',
          targetValue: data.targetValue || 0,
          polarity: (data.polarity as 'UP' | 'DOWN') || 'UP',
        });
      } catch (error) {
        console.error('Erro ao carregar KPI:', error);
        toast.error('Erro ao carregar KPI');
        router.push('/strategic/kpis');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchKPI();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSaving(true);

    try {
      await fetchAPI(`/api/strategic/kpis/${id}`, {
        method: 'PUT',
        body: {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description?.trim(),
          unit: formData.unit,
          frequency: formData.frequency,
          polarity: formData.polarity,
          targetValue: Number(formData.targetValue),
        },
      });

      toast.success('KPI atualizado com sucesso!');
      router.push('/strategic/kpis');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar KPI');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Carregando KPI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Editar KPI
          </h1>
          <p className="text-white/60 mt-1">
            Atualize as informações do indicador
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Código *
            </label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex: OTD"
              required
              disabled
              className="bg-white/10 border-white/20 text-white placeholder-white/40"
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Nome *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: On-Time Delivery"
              required
              className="bg-white/10 border-white/20 text-white placeholder-white/40"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Descrição
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o propósito e metodologia de cálculo..."
              rows={4}
              className="bg-white/10 border-white/20 text-white placeholder-white/40"
            />
          </div>

          {/* Unidade e Frequência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Unidade *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                {UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value} className="bg-gray-800">
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Frequência *
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value} className="bg-gray-800">
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meta e Polaridade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Valor Meta *
              </label>
              <Input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                placeholder="100"
                required
                className="bg-white/10 border-white/20 text-white placeholder-white/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Polaridade *
              </label>
              <select
                value={formData.polarity}
                onChange={(e) => setFormData({ ...formData, polarity: e.target.value as 'UP' | 'DOWN' })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="UP" className="bg-gray-800">Quanto maior, melhor</option>
                <option value="DOWN" className="bg-gray-800">Quanto menor, melhor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
