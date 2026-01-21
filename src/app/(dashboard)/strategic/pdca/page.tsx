"use client";

/**
 * Página: PDCA Kanban
 * Gerenciamento de planos de ação por fase PDCA
 * 
 * @module app/(dashboard)/strategic/pdca
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Card,
  Title,
  Text,
  Flex, 
  Badge,
} from '@tremor/react';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Plus,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';

import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';
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
      <div className="min-h-screen -m-6 p-8 space-y-6">
        {/* Header */}
        <PageHeader
          icon="🔄"
          title="Ciclos PDCA"
          description="Arraste os cards para avançar nas fases do ciclo (Plan → Do → Check → Act)"
          recordCount={stats.total}
          showBack
          onRefresh={fetchKanbanData}
          isLoading={loading}
          actions={
            <>
              <Link href="/strategic/action-plans">
                <RippleButton
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Ver por Status
                </RippleButton>
              </Link>
              <RippleButton
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </RippleButton>
              <Link href="/strategic/action-plans/new">
                <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Plano
                </RippleButton>
              </Link>
            </>
          }
        />

        {/* Stats Cards - Enterprise Pattern */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <EnterpriseMetricCard
              icon={<Layers className="h-6 w-6 text-purple-400" />}
              badge="Total"
              title="Total Ativos"
              value={stats.total}
              subtitle="planos em ciclo"
              variant="purple"
              delay={0.2}
            />
            <EnterpriseMetricCard
              icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
              badge="Atrasado"
              badgeEmoji="❌"
              title="Atrasados"
              value={stats.overdue}
              subtitle="ação urgente"
              variant="red"
              delay={0.3}
              isUrgent={stats.overdue > 0}
            />
            <EnterpriseMetricCard
              icon={<CheckCircle className="h-6 w-6 text-green-400" />}
              badge="Concluído"
              badgeEmoji="✅"
              title="Concluídos (Mês)"
              value={stats.completedThisMonth}
              subtitle="finalizados"
              variant="green"
              delay={0.4}
            />
            <EnterpriseMetricCard
              icon={<Clock className="h-6 w-6 text-blue-400" />}
              badge="CHECK"
              badgeEmoji="🔍"
              title="Em CHECK"
              value={phaseStats.CHECK || 0}
              subtitle="fase de verificação"
              variant="blue"
              delay={0.5}
            />
          </div>
        </StaggerContainer>

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
