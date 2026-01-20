"use client";

/**
 * Página: PDCA Kanban
 * Gerenciamento de planos de ação por fase PDCA
 * 
 * @module app/(dashboard)/strategic/pdca
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
  Metric,
} from '@tremor/react';
import { 
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Plus,
  RotateCcw,
  Info,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PdcaKanban, type KanbanColumn, type PdcaPhase } from '@/components/strategic/PdcaKanban';

interface KanbanApiResponse {
  columns: Array<{
    id: string;
    title: string;
    color: string;
    items: Array<{
      id: string;
      code: string;
      what: string;
      who: string;
      whenEnd: string;
      completionPercent: number;
      priority: string;
      isOverdue: boolean;
      daysUntilDue: number;
    }>;
  }>;
  stats: {
    total: number;
    overdue: number;
    completedThisMonth: number;
  };
}

// Mapear para o formato do componente
function mapApiToKanban(columns: KanbanApiResponse['columns']): KanbanColumn[] {
  return columns.map(col => ({
    id: col.id as PdcaPhase,
    title: col.title.replace(/^[^\s]+\s/, ''), // Remover emoji do título
    items: col.items.map(item => ({
      ...item,
      priority: item.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    })),
  }));
}

export default function PdcaKanbanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    completedThisMonth: 0,
  });

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const fetchKanbanData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/action-plans/kanban');
      if (response.ok) {
        const data: KanbanApiResponse = await response.json();
        setColumns(mapApiToKanban(data.columns));
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar kanban PDCA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardMove = useCallback(async (
    cardId: string, 
    fromPhase: PdcaPhase, 
    toPhase: PdcaPhase
  ) => {
    try {
      // Chamar API para avançar fase PDCA
      const response = await fetch(`/api/strategic/action-plans/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Movido de ${fromPhase} para ${toPhase}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar fase');
      }

      // Recarregar dados
      await fetchKanbanData();
    } catch (error) {
      console.error('Erro ao mover card:', error);
      throw error;
    }
  }, []);

  const handleCardClick = useCallback((cardId: string) => {
    router.push(`/strategic/action-plans/${cardId}`);
  }, [router]);

  // Calcular totais por fase
  const phaseStats = columns.reduce((acc, col) => {
    acc[col.id] = col.items.length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <RotateCcw className="text-purple-400" />
                  Ciclos PDCA
                </h1>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Arraste os cards para avançar nas fases do ciclo (Plan → Do → Check → Act)
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={fetchKanbanData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
              <RippleButton 
                variant="default" 
                onClick={() => router.push('/strategic/action-plans/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </RippleButton>
            </Flex>
          </motion.div>
        </FadeIn>

        {/* Stats Cards */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <Flex alignItems="center" className="gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <Text className="text-gray-400">Total Ativos</Text>
                  <Metric className="text-white">{stats.total}</Metric>
                </div>
              </Flex>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <Flex alignItems="center" className="gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <Text className="text-gray-400">Atrasados</Text>
                  <Metric className="text-red-400">{stats.overdue}</Metric>
                </div>
              </Flex>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <Flex alignItems="center" className="gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <Text className="text-gray-400">Concluídos (Mês)</Text>
                  <Metric className="text-emerald-400">{stats.completedThisMonth}</Metric>
                </div>
              </Flex>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <Flex alignItems="center" className="gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <Text className="text-gray-400">Em CHECK</Text>
                  <Metric className="text-purple-400">{phaseStats.CHECK || 0}</Metric>
                </div>
              </Flex>
            </Card>
          </div>
        </FadeIn>

        {/* Phase Summary */}
        <FadeIn delay={0.15}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Flex className="gap-4" justifyContent="start">
              <Badge color="blue" size="lg">
                PLAN: {phaseStats.PLAN || 0}
              </Badge>
              <Badge color="amber" size="lg">
                DO: {phaseStats.DO || 0}
              </Badge>
              <Badge color="purple" size="lg">
                CHECK: {phaseStats.CHECK || 0}
              </Badge>
              <Badge color="emerald" size="lg">
                ACT: {phaseStats.ACT || 0}
              </Badge>
            </Flex>
          </Card>
        </FadeIn>

        {/* Kanban Board */}
        <FadeIn delay={0.2}>
          <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="mb-4">
              <Title className="text-white">Quadro PDCA</Title>
              <Text className="text-gray-400">
                Arraste os cards para avançar ou retroceder nas fases
              </Text>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                  <Text className="text-gray-400">Carregando kanban...</Text>
                </div>
              </div>
            ) : columns.length > 0 && columns.some(c => c.items.length > 0) ? (
              <PdcaKanban
                columns={columns}
                onCardMove={handleCardMove}
                onCardClick={handleCardClick}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <Title className="text-gray-400">Nenhum plano de ação</Title>
                  <Text className="text-gray-500 mt-2">
                    Crie planos de ação para visualizá-los no kanban PDCA.
                  </Text>
                  <RippleButton 
                    className="mt-4"
                    onClick={() => router.push('/strategic/action-plans/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Plano de Ação
                  </RippleButton>
                </div>
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Transition Rules Info */}
        <FadeIn delay={0.3}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm"
          >
            <p className="text-blue-300 text-sm flex items-center gap-2 flex-wrap">
              <Info size={16} />
              <strong>Regras de Transição:</strong>
              <span className="flex items-center gap-1">
                <span className="text-blue-400">PLAN</span>→<span className="text-amber-400">DO</span>→
                <span className="text-purple-400">CHECK</span>→<span className="text-emerald-400">ACT</span>
              </span>
              <span className="text-blue-200/70">|</span>
              <span>Do CHECK pode voltar para DO se necessário retrabalho.</span>
            </p>
          </motion.div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
