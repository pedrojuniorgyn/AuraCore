/**
 * Página: Aprovações de Estratégias
 * Dashboard unificado para gestão de aprovações com tabs:
 * - Pendentes: Aprovações aguardando decisão do usuário
 * - Histórico: Timeline de todas as decisões
 * - Minhas Submissões: Estratégias que o usuário submeteu
 * 
 * @module app/(dashboard)/strategic/approvals
 */
"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Send,
  History,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { ApprovalCard } from './components/ApprovalCard';
import { ApprovalTimeline } from './components/ApprovalTimeline';
import { SubmissionStatusBadge } from './components/SubmissionStatusBadge';
import { useApprovals } from './hooks/useApprovals';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { useClientFormattedDate } from '@/hooks/useClientFormattedTime';

// Componentes auxiliares para formatar datas (evitam hydration mismatch)
function SubmittedDate({ date }: { date: string }) {
  const formatted = useClientFormattedDate(date);
  if (!formatted) return null;
  return <span>Submetida em: {formatted}</span>;
}

function DecidedDate({ date }: { date: string }) {
  const formatted = useClientFormattedDate(date);
  if (!formatted) return null;
  return <span>Decidida em: {formatted}</span>;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const { pending, history, mySubmissions, isLoading, refetch } = useApprovals();

  const stats = {
    pending: pending?.length || 0,
    urgent: pending?.filter(p => p.isUrgent).length || 0,
    approved: history?.filter(h => h.decision === 'APPROVED' || h.action === 'APPROVED').length || 0,
    rejected: history?.filter(h => h.decision === 'REJECTED' || h.action === 'REJECTED').length || 0,
    mySubmissions: mySubmissions?.length || 0,
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
        {/* Header */}
        <div className="mb-6">
          <PageHeader
            icon={<CheckCircle2 />}
            title="Aprovações de Estratégias"
            description="Gerencie aprovações pendentes e acompanhe o histórico de decisões"
            actions={
              <RippleButton
                onClick={() => refetch()}
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            }
          />
        </div>

        {/* Summary Cards */}
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pendentes */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-300/80 mb-1">Pendentes</p>
                  <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                  <p className="text-xs text-gray-400 mt-1">aguardando sua decisão</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
              {stats.urgent > 0 && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {stats.urgent} urgente{stats.urgent !== 1 && 's'} (&gt;3 dias)
                </div>
              )}
            </div>

            {/* Aprovadas */}
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/80 mb-1">Aprovadas</p>
                  <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
                  <p className="text-xs text-gray-400 mt-1">no período</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            {/* Rejeitadas */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-300/80 mb-1">Rejeitadas</p>
                  <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
                  <p className="text-xs text-gray-400 mt-1">com motivo registrado</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>

            {/* Minhas Submissões */}
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300/80 mb-1">Minhas Submissões</p>
                  <p className="text-3xl font-bold text-purple-400">{stats.mySubmissions}</p>
                  <p className="text-xs text-gray-400 mt-1">aguardando decisão</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Send className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.1}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border border-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="pending" 
                className="relative data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
              >
                <Clock className="w-4 h-4 mr-2" />
                Pendentes
                {stats.pending > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 min-w-5 px-1.5 bg-red-500/80"
                  >
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
              >
                <History className="w-4 h-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger 
                value="my-submissions"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
              >
                <Send className="w-4 h-4 mr-2" />
                Minhas Submissões
              </TabsTrigger>
            </TabsList>

            {/* Tab: Pendentes */}
            <TabsContent value="pending" className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Carregando aprovações...</p>
                </div>
              ) : pending && pending.length > 0 ? (
                <StaggerContainer>
                  {pending.map((item, index) => (
                    <ApprovalCard
                      key={item.id}
                      approval={item}
                      onApprove={() => refetch()}
                      onReject={() => refetch()}
                      delay={index * 0.1}
                    />
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                  <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-200 mb-2">
                    Nenhuma aprovação pendente
                  </h3>
                  <p className="text-gray-400">
                    Você está em dia com suas aprovações!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="history" className="mt-6">
              <ApprovalTimeline items={history || []} isLoading={isLoading} />
            </TabsContent>

            {/* Tab: Minhas Submissões */}
            <TabsContent value="my-submissions" className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Carregando submissões...</p>
                </div>
              ) : mySubmissions && mySubmissions.length > 0 ? (
                <StaggerContainer>
                  {mySubmissions.map((item, index) => (
                    <FadeIn key={item.id} delay={index * 0.05}>
                      <div
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-lg font-medium text-gray-100">
                                {item.strategyTitle}
                              </h3>
                              <SubmissionStatusBadge status={item.status} />
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                              Código: <span className="font-mono text-gray-300">{item.strategyCode}</span>
                            </p>
                            <div className="flex items-center gap-6 text-sm text-gray-400 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <SubmittedDate date={item.submittedAt} />
                              </div>
                              {item.decidedAt && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <DecidedDate date={item.decidedAt} />
                                </div>
                              )}
                              {item.decidedBy && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Por: {item.decidedBy}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Send className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-200 mb-2">
                    Nenhuma submissão
                  </h3>
                  <p className="text-gray-400">
                    Você ainda não submeteu nenhuma estratégia para aprovação.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
