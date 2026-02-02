/**
 * Página: Aprovações Pendentes
 * Dashboard de estratégias aguardando aprovação
 * 
 * @module app/(dashboard)/strategic/workflow/pending
 */
"use client";

import { Card, Title, Text, Grid } from '@tremor/react';
import { Clock, CheckCircle, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { StrategyApprovalCard } from '@/components/strategic/StrategyApprovalCard';
import { usePendingApprovals } from '@/hooks/strategic/usePendingApprovals';

const getDaysAgo = (submittedAt: string): number => {
  return Math.ceil((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24));
};

export default function PendingApprovalsPage() {
  const { data: strategies, total, isLoading, error, refetch } = usePendingApprovals();

  // Métricas calculadas (usando helper function)
  const urgentCount = strategies.filter((s) => getDaysAgo(s.submittedAt) >= 3).length;
  const oldestSubmission = strategies.length > 0
    ? Math.max(...strategies.map((s) => getDaysAgo(s.submittedAt)))
    : 0;

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <Text>Erro ao carregar aprovações pendentes: {error.message}</Text>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
        <div className="mb-6">
          <PageHeader
            icon={<Clock />}
            title="Aprovações Pendentes"
            description="Estratégias aguardando sua revisão e aprovação"
            actions={
              <RippleButton
                onClick={() => refetch()}
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            }
          />
        </div>

        {/* Métricas */}
        <FadeIn>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Total Pendente</Text>
                  <Title className="mt-1">{total}</Title>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Urgentes (&gt;3 dias)</Text>
                  <Title className="mt-1">{urgentCount}</Title>
                </div>
                <AlertTriangle className={`h-8 w-8 ${urgentCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Mais Antiga</Text>
                  <Title className="mt-1">{oldestSubmission} dias</Title>
                </div>
                <Clock className={`h-8 w-8 ${oldestSubmission >= 5 ? 'text-red-500' : 'text-yellow-500'}`} />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Meta de Resposta</Text>
                  <Title className="mt-1">&lt; 3 dias</Title>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>
          </Grid>
        </FadeIn>

        {/* Lista de Aprovações Pendentes */}
        <FadeIn delay={0.1}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Title>Estratégias Pendentes</Title>
                <Text className="mt-1">
                  {total === 0
                    ? 'Nenhuma estratégia pendente de aprovação'
                    : `${total} estratégia${total !== 1 ? 's' : ''} aguardando revisão`}
                </Text>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                <Text>Carregando aprovações pendentes...</Text>
              </div>
            ) : total === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <Title>Tudo aprovado!</Title>
                <Text className="mt-2">Não há estratégias pendentes de aprovação no momento.</Text>
              </div>
            ) : (
              <StaggerContainer className="space-y-4">
                {strategies.map((strategy) => (
                  <FadeIn key={strategy.id}>
                    <StrategyApprovalCard strategy={strategy} />
                  </FadeIn>
                ))}
              </StaggerContainer>
            )}
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
