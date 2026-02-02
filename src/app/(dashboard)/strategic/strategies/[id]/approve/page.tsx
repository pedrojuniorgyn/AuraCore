/**
 * Página: Aprovação de Estratégia
 * Página para revisar e aprovar/rejeitar estratégia
 * 
 * @module app/(dashboard)/strategic/strategies/[id]/approve
 */
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Title, Text, Grid } from '@tremor/react';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Target,
  Eye,
} from 'lucide-react';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { ApprovalActionsForm } from '@/components/strategic/ApprovalActionsForm';
import { ApprovalHistoryTimeline } from '@/components/strategic/ApprovalHistoryTimeline';
import { useStrategyById } from '@/hooks/strategic/useStrategyById';
import { useApprovalHistory } from '@/hooks/strategic/useApprovalHistory';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StrategyApprovePageProps {
  params: {
    id: string;
  };
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export default function StrategyApprovePage({ params }: StrategyApprovePageProps) {
  const router = useRouter();
  const { data: strategy, isLoading, error } = useStrategyById(params.id);
  const { data: history, isLoading: historyLoading } = useApprovalHistory(params.id);
  const [actionCompleted, setActionCompleted] = useState(false);

  const handleSuccess = () => {
    setActionCompleted(true);
    toast.success('Ação processada com sucesso!');
    
    // Redirecionar após 2 segundos
    setTimeout(() => {
      router.push('/strategic/workflow/pending');
    }, 2000);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <Text>Erro ao carregar estratégia: {error.message}</Text>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (isLoading || !strategy) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
          <Card className="p-6">
            <Text>Carregando estratégia...</Text>
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
            icon={<Eye />}
            title={`Revisar: ${strategy.name}`}
            description="Analise a estratégia e tome uma decisão de aprovação"
            actions={
              <RippleButton
                onClick={() => router.push('/strategic/workflow/pending')}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </RippleButton>
            }
          />
        </div>

        <Grid numItemsLg={3} className="gap-6">
          {/* Coluna principal - Detalhes da estratégia */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status e Informações Básicas */}
            <FadeIn>
              <Card className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Title className="text-2xl">{strategy.name}</Title>
                    {strategy.versionName && (
                      <Text className="mt-1 text-gray-500">Versão: {strategy.versionName}</Text>
                    )}
                  </div>
                  <Badge variant="warning">
                    {strategy.workflowStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <div>
                        <Text className="text-sm font-medium">Tipo de Versão</Text>
                        <Text className="text-sm text-gray-600">{strategy.versionType}</Text>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-500" />
                      <div>
                        <Text className="text-sm font-medium">Período</Text>
                        <Text className="text-sm text-gray-600">
                          {formatDate(strategy.startDate)} - {formatDate(strategy.endDate)}
                        </Text>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-purple-500" />
                      <div>
                        <Text className="text-sm font-medium">Submetido por</Text>
                        <Text className="text-sm text-gray-600">
                          Usuário #{strategy.submittedByUserId}
                        </Text>
                      </div>
                    </div>

                    {strategy.submittedAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-yellow-500" />
                        <div>
                          <Text className="text-sm font-medium">Data de Submissão</Text>
                          <Text className="text-sm text-gray-600">
                            {formatDate(strategy.submittedAt)}
                          </Text>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </FadeIn>

            {/* Visão, Missão e Valores */}
            <FadeIn delay={0.1}>
              <Card className="p-6">
                <Title className="mb-4">Detalhes da Estratégia</Title>

                <div className="space-y-4">
                  {strategy.vision && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-2">Visão</Text>
                      <Text className="text-gray-600">{strategy.vision}</Text>
                    </div>
                  )}

                  {strategy.mission && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-2">Missão</Text>
                      <Text className="text-gray-600">{strategy.mission}</Text>
                    </div>
                  )}

                  {strategy.values && strategy.values.length > 0 && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-2">Valores</Text>
                      <div className="flex flex-wrap gap-2">
                        {strategy.values.map((value, index) => (
                          <Badge key={index} variant="outline">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </FadeIn>

            {/* Formulário de Aprovação */}
            {!actionCompleted && strategy.workflowStatus === 'PENDING_APPROVAL' && (
              <FadeIn delay={0.2}>
                <ApprovalActionsForm
                  strategyId={strategy.id}
                  strategyName={strategy.name}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </FadeIn>
            )}

            {actionCompleted && (
              <FadeIn delay={0.2}>
                <Card className="p-6 bg-green-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <Title className="text-green-800">Ação Concluída!</Title>
                      <Text className="text-green-700 mt-1">
                        Redirecionando para lista de pendências...
                      </Text>
                    </div>
                  </div>
                </Card>
              </FadeIn>
            )}
          </div>

          {/* Sidebar - Histórico */}
          <div className="space-y-6">
            <FadeIn delay={0.3}>
              <ApprovalHistoryTimeline history={history} isLoading={historyLoading} />
            </FadeIn>
          </div>
        </Grid>
      </div>
    </PageTransition>
  );
}
