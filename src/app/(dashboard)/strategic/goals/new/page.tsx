'use client';

/**
 * Página: Novo Objetivo Estratégico
 * Formulário para criação de objetivos alinhados ao BSC
 * 
 * @module app/(dashboard)/strategic/goals/new
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { FadeIn } from '@/components/ui/animated-wrappers';
import { fetchAPI } from '@/lib/api';

const BSC_PERSPECTIVES = [
  { code: 'FIN', name: 'Financeira', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
  { code: 'CLI', name: 'Clientes', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  { code: 'INT', name: 'Processos Internos', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' },
  { code: 'LRN', name: 'Aprendizado e Crescimento', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/50' },
];

const CASCADE_LEVELS = [
  { value: 'STRATEGIC', label: 'Estratégico (Corporativo)' },
  { value: 'TACTICAL', label: 'Tático (Departamental)' },
  { value: 'OPERATIONAL', label: 'Operacional (Equipe)' },
];

interface StrategyOption {
  id: string;
  code: string;
  name: string;
}

export default function NewGoalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    perspectiveCode: 'FIN',
    cascadeLevel: 'STRATEGIC',
    targetValue: 100,
    unit: 'PERCENTAGE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    strategyId: '',
    weight: 1,
  });

  // Carregar estratégias disponíveis
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const data = await fetchAPI<{ items: StrategyOption[] }>('/api/strategic/strategies?status=ACTIVE');
        setStrategies(data.items || []);
        if (data.items?.length > 0) {
          setFormData(prev => ({ ...prev, strategyId: data.items[0].id }));
        }
      } catch (error) {
        console.error('Erro ao carregar estratégias:', error);
      }
    };
    fetchStrategies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.code.trim()) {
      toast.error('Código é obrigatório');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!formData.endDate) {
      toast.error('Data de término é obrigatória');
      return;
    }

    setIsLoading(true);

    try {
      await fetchAPI('/api/strategic/goals', {
        method: 'POST',
        body: {
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim(),
          perspectiveCode: formData.perspectiveCode, // API agora aceita code
          cascadeLevel: formData.cascadeLevel,
          targetValue: Number(formData.targetValue),
          unit: formData.unit,
          startDate: formData.startDate,
          endDate: formData.endDate,
          strategyId: formData.strategyId || undefined,
          weight: Number(formData.weight),
        },
      });

      toast.success('Objetivo criado com sucesso!');
      router.push('/strategic/goals');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

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
              <Target className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Novo Objetivo Estratégico
              </h1>
            </div>
            <p className="text-white/60 mt-1 ml-11">
              Defina um objetivo alinhado ao BSC
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
            {/* Estratégia vinculada */}
            {strategies.length > 0 && (
              <div>
                <label className="block text-white/70 text-sm mb-2">Estratégia Vinculada</label>
                <select
                  value={formData.strategyId}
                  onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  <option value="">Nenhuma (objetivo independente)</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Código e Nível */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Código *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="OBJ-FIN-001"
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Nível de Cascata *</label>
                <select
                  value={formData.cascadeLevel}
                  onChange={(e) => setFormData({ ...formData, cascadeLevel: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  {CASCADE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Perspectiva BSC */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Perspectiva BSC *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BSC_PERSPECTIVES.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, perspectiveCode: p.code })}
                    className={`p-4 rounded-xl border transition-all ${
                      formData.perspectiveCode === p.code
                        ? `${p.bg} ${p.border} ${p.color}`
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Descrição do Objetivo *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aumentar receita líquida em 20% até dezembro de 2026..."
                className="bg-white/5 border-white/10 min-h-[100px] focus:border-purple-500/50"
                required
              />
            </div>

            {/* Datas e Meta */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Data Início *</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Data Fim *</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Meta</label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                  min={0}
                  className="bg-white/5 border-white/10 focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Unidade</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="CURRENCY">Moeda (R$)</option>
                  <option value="NUMBER">Número</option>
                  <option value="DAYS">Dias</option>
                </select>
              </div>
            </div>

            {/* Peso */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Peso na Perspectiva</label>
              <div className="flex items-center gap-4">
                <Input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-white/70 w-12 text-center">{formData.weight.toFixed(1)}x</span>
              </div>
              <p className="text-white/40 text-xs mt-1">
                Objetivos com maior peso têm mais influência no cálculo da perspectiva
              </p>
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
                Criar Objetivo
              </Button>
            </div>
          </motion.form>
        </GlassmorphismCard>
      </FadeIn>
    </div>
  );
}
