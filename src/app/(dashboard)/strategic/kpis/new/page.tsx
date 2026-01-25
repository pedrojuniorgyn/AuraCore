'use client';

/**
 * Página: Novo KPI
 * Formulário para criação de indicadores chave de performance
 * 
 * @module app/(dashboard)/strategic/kpis/new
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, ArrowLeft, Save, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { FadeIn } from '@/components/ui/animated-wrappers';
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

const DATA_SOURCES = [
  { value: 'MANUAL', label: 'Entrada Manual' },
  { value: 'FINANCIAL', label: 'Módulo Financeiro' },
  { value: 'TMS', label: 'Módulo TMS' },
  { value: 'FISCAL', label: 'Módulo Fiscal' },
  { value: 'HR', label: 'Módulo RH' },
  { value: 'API', label: 'API Externa' },
];

interface GoalOption {
  id: string;
  code: string;
  description: string;
}

export default function NewKPIPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'PERCENTAGE',
    frequency: 'MONTHLY',
    targetValue: 0,
    minimumValue: 0,
    stretchValue: 0,
    direction: 'UP' as 'UP' | 'DOWN',
    goalId: '',
    dataSource: 'MANUAL',
    formula: '',
  });

  // Carregar objetivos disponíveis
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const data = await fetchAPI<{ items: GoalOption[] }>('/api/strategic/goals?pageSize=100');
        setGoals(data.items || []);
      } catch (error) {
        console.error('Erro ao carregar objetivos:', error);
      }
    };
    fetchGoals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    try {
      await fetchAPI('/api/strategic/kpis', {
        method: 'POST',
        body: {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description?.trim(),
          unit: formData.unit,
          frequency: formData.frequency,
          direction: formData.direction,
          targetValue: Number(formData.targetValue),
          criticalThreshold: Number(formData.minimumValue), // Map minimum -> critical
          baselineValue: Number(formData.stretchValue), // Map stretch -> baseline (temporary mapping)
          goalId: formData.goalId || undefined,
          dataSource: formData.dataSource,
          sourceQuery: formData.formula || undefined, // Map formula -> sourceQuery
        },
      });

      toast.success('KPI criado com sucesso!');
      router.push('/strategic/kpis');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUnit = UNITS.find(u => u.value === formData.unit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Novo KPI
              </h1>
            </div>
            <p className="text-white/60 mt-1 ml-11">
              Defina um indicador chave de performance
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Form */}
      <FadeIn delay={0.1}>
        <GlassmorphismCard className="p-6">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Objetivo vinculado */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Objetivo Vinculado</label>
              <select
                value={formData.goalId}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
              >
                <option value="">Nenhum (KPI independente)</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.code} - {g.description}</option>
                ))}
              </select>
            </div>

            {/* Código e Nome */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Código *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="KPI-FIN-001"
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Nome do KPI *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Taxa de Entrega no Prazo (OTD)"
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  required
                />
              </div>
            </div>

            {/* Unidade, Frequência e Direção */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Unidade *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Frequência *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Direção</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direction: 'UP' })}
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      formData.direction === 'UP'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <TrendingUp size={18} />
                    Maior
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direction: 'DOWN' })}
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      formData.direction === 'DOWN'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <TrendingDown size={18} />
                    Menor
                  </button>
                </div>
              </div>
            </div>

            {/* Metas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Mínimo Aceitável {selectedUnit?.symbol && `(${selectedUnit.symbol})`}
                </label>
                <Input
                  type="number"
                  value={formData.minimumValue}
                  onChange={(e) => setFormData({ ...formData, minimumValue: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  step="0.01"
                />
                <p className="text-white/40 text-xs mt-1">Valor vermelho</p>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Meta *  {selectedUnit?.symbol && `(${selectedUnit.symbol})`}
                </label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  step="0.01"
                  required
                />
                <p className="text-white/40 text-xs mt-1">Valor verde</p>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Meta Stretch {selectedUnit?.symbol && `(${selectedUnit.symbol})`}
                </label>
                <Input
                  type="number"
                  value={formData.stretchValue}
                  onChange={(e) => setFormData({ ...formData, stretchValue: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  step="0.01"
                />
                <p className="text-white/40 text-xs mt-1">Valor excepcional</p>
              </div>
            </div>

            {/* Fonte de Dados */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Fonte de Dados</label>
              <select
                value={formData.dataSource}
                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
              >
                {DATA_SOURCES.map((ds) => (
                  <option key={ds.value} value={ds.value}>{ds.label}</option>
                ))}
              </select>
            </div>

            {/* Descrição / Fórmula */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Descrição / Fórmula de Cálculo</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o KPI e como é calculado. Ex: (Entregas no prazo / Total de entregas) x 100"
                className="bg-white/5 border-white/10 min-h-[100px] focus:border-purple-500/50"
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="bg-white/5 border-white/10 hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                Criar KPI
              </Button>
            </div>
          </motion.form>
        </GlassmorphismCard>
      </FadeIn>
    </div>
  );
}
