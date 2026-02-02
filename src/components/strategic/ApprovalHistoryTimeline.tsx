/**
 * Component: ApprovalHistoryTimeline
 * Timeline visual do histórico de aprovações
 * 
 * @module components/strategic
 */
"use client";

import { Card, Title, Text } from '@tremor/react';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  AlertCircle,
  Clock,
  User,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ApprovalHistoryEntry } from '@/hooks/strategic/useApprovalHistory';

export interface ApprovalHistoryTimelineProps {
  history: ApprovalHistoryEntry[];
  isLoading?: boolean;
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

export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  history,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Title className="mb-4">Histórico de Aprovações</Title>
        <div className="text-center py-6">
          <Clock className="h-6 w-6 animate-spin text-purple-400 mx-auto mb-2" />
          <Text>Carregando histórico...</Text>
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6">
        <Title className="mb-4">Histórico de Aprovações</Title>
        <div className="text-center py-6">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <Text>Nenhuma ação registrada ainda</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Title className="mb-6">Histórico de Aprovações</Title>

      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {history.map((entry) => (
            <div key={entry.id} className="relative pl-10">
              {/* Ícone da timeline */}
              <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-gray-200">
                {getActionIcon(entry.action)}
              </div>

              {/* Conteúdo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getActionColor(entry.action)}>
                    {getActionLabel(entry.action)}
                  </Badge>
                  <Text className="text-sm text-gray-500">{formatDate(entry.createdAt)}</Text>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <Text>
                    {entry.actorName || `Usuário #${entry.actorUserId}`}
                  </Text>
                </div>

                <div className="text-sm">
                  <Text className="text-gray-600">
                    <strong>Status:</strong> {entry.fromStatus} → {entry.toStatus}
                  </Text>
                </div>

                {entry.comments && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <Text className="text-gray-700 font-medium">Comentários:</Text>
                        <Text className="text-gray-600 mt-1">{entry.comments}</Text>
                      </div>
                    </div>
                  </div>
                )}

                {entry.reason && (
                  <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <Text className="text-gray-700 font-medium">Motivo:</Text>
                        <Text className="text-gray-600 mt-1">{entry.reason}</Text>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
