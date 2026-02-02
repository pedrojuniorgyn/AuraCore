/**
 * Página: Histórico de Aprovações
 * Listagem completa de todas as aprovações do sistema
 * 
 * @module app/(dashboard)/strategic/workflow/history
 */
"use client";

import { useState, useEffect } from 'react';
import { Card, Title, Text, Select, SelectItem } from '@tremor/react';
import {
  History,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  AlertCircle,
  Filter,
  Download,
  Calendar,
  User,
  MessageSquare,
} from 'lucide-react';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
interface HistoryEntry {
  id: string;
  strategyId: string;
  strategyName: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'RESUBMIT';
  actorUserId: number;
  actorName?: string;
  comments?: string;
  reason?: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'SUBMIT':
      return <Send className="h-5 w-5 text-blue-500" />;
    case 'APPROVE':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'REJECT':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'REQUEST_CHANGES':
      return <RefreshCw className="h-5 w-5 text-yellow-500" />;
    case 'RESUBMIT':
      return <Send className="h-5 w-5 text-purple-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'SUBMIT':
      return 'Submetido';
    case 'APPROVE':
      return 'Aprovado';
    case 'REJECT':
      return 'Rejeitado';
    case 'REQUEST_CHANGES':
      return 'Alterações Solicitadas';
    case 'RESUBMIT':
      return 'Reenviado';
    default:
      return action;
  }
};

const getActionColor = (action: string): "success" | "destructive" | "warning" | "info" | "default" => {
  switch (action) {
    case 'APPROVE':
      return 'success';
    case 'REJECT':
      return 'destructive';
    case 'REQUEST_CHANGES':
      return 'warning';
    case 'SUBMIT':
    case 'RESUBMIT':
      return 'info';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function ApprovalHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        // TODO: Implementar API endpoint para histórico geral
        // Por ora, usando dados mock
        const mockData: HistoryEntry[] = [
          {
            id: '1',
            strategyId: 'str-1',
            strategyName: 'Plano Estratégico 2026',
            action: 'APPROVE',
            actorUserId: 101,
            actorName: 'João Silva',
            comments: 'Estratégia bem estruturada, aprovado.',
            fromStatus: 'PENDING_APPROVAL',
            toStatus: 'APPROVED',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            strategyId: 'str-2',
            strategyName: 'Orçamento 2026',
            action: 'REQUEST_CHANGES',
            actorUserId: 102,
            actorName: 'Maria Santos',
            reason: 'Necessário ajustes nos valores projetados.',
            fromStatus: 'PENDING_APPROVAL',
            toStatus: 'CHANGES_REQUESTED',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ];
        setHistory(mockData);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = history.filter((entry) => {
    if (actionFilter !== 'all' && entry.action !== actionFilter) {
      return false;
    }
    // TODO: Implementar filtro por data
    return true;
  });

  const handleExportCSV = () => {
    // TODO: Implementar export CSV
    console.log('Exportando histórico para CSV...');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
        <div className="mb-6">
          <PageHeader
            icon={<History />}
            title="Histórico de Aprovações"
            description="Registro completo de todas as ações do workflow de aprovação"
            actions={
              <div>
                <RippleButton
                  onClick={handleExportCSV}
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </RippleButton>
              </div>
            }
          />
        </div>

        {/* Filtros */}
        <FadeIn>
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <Text className="font-medium">Filtros:</Text>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm mb-2">Ação</Text>
                  <Select
                    value={actionFilter}
                    onValueChange={setActionFilter}
                  >
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="APPROVE">Aprovações</SelectItem>
                    <SelectItem value="REJECT">Rejeições</SelectItem>
                    <SelectItem value="REQUEST_CHANGES">Solicitações de Alteração</SelectItem>
                    <SelectItem value="SUBMIT">Submissões</SelectItem>
                    <SelectItem value="RESUBMIT">Reenvios</SelectItem>
                  </Select>
                </div>

                <div>
                  <Text className="text-sm mb-2">Período</Text>
                  <Select
                    value={dateFilter}
                    onValueChange={setDateFilter}
                  >
                    <SelectItem value="all">Todo o Período</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="quarter">Último Trimestre</SelectItem>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Lista de Histórico */}
        <FadeIn delay={0.1}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Title>Registros de Aprovação</Title>
                <Text className="mt-1">
                  {filteredHistory.length} {filteredHistory.length === 1 ? 'registro' : 'registros'}
                </Text>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                <Text>Carregando histórico...</Text>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Title>Nenhum registro encontrado</Title>
                <Text className="mt-2">Ajuste os filtros para ver mais resultados.</Text>
              </div>
            ) : (
              <StaggerContainer className="space-y-4">
                {filteredHistory.map((entry) => (
                  <FadeIn key={entry.id}>
                    <Card className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {getActionIcon(entry.action)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getActionColor(entry.action)}>
                              {getActionLabel(entry.action)}
                            </Badge>
                            <Text className="text-sm font-medium">
                              {entry.strategyName}
                            </Text>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <Text>{entry.actorName || `Usuário #${entry.actorUserId}`}</Text>
                            </div>

                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <Text>{formatDate(entry.createdAt)}</Text>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <Text>
                              <strong>Transição:</strong> {entry.fromStatus} → {entry.toStatus}
                            </Text>
                          </div>

                          {entry.comments && (
                            <div className="bg-blue-50 rounded-lg p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                                <Text className="text-gray-700">{entry.comments}</Text>
                              </div>
                            </div>
                          )}

                          {entry.reason && (
                            <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <Text className="text-gray-700">{entry.reason}</Text>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
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
