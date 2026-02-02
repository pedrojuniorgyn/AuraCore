/**
 * Component: StrategyApprovalCard
 * Card de estratégia pendente de aprovação
 * 
 * @module components/strategic
 */
"use client";

import { useRouter } from 'next/navigation';
import { Card, Title, Text } from '@tremor/react';
import { Clock, User, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PendingStrategy } from '@/hooks/strategic/usePendingApprovals';

export interface StrategyApprovalCardProps {
  strategy: PendingStrategy;
}

const getVersionTypeColor = (type: string): "success" | "warning" | "info" | "default" => {
  switch (type) {
    case 'ACTUAL':
      return 'success';
    case 'BUDGET':
      return 'info';
    case 'FORECAST':
      return 'warning';
    case 'SCENARIO':
      return 'default';
    default:
      return 'default';
  }
};

const getVersionTypeLabel = (type: string): string => {
  switch (type) {
    case 'ACTUAL':
      return 'Realizado';
    case 'BUDGET':
      return 'Orçado';
    case 'FORECAST':
      return 'Forecast';
    case 'SCENARIO':
      return 'Cenário';
    default:
      return type;
  }
};

const getDaysAgo = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const StrategyApprovalCard: React.FC<StrategyApprovalCardProps> = ({ strategy }) => {
  const router = useRouter();

  const daysAgo = getDaysAgo(strategy.submittedAt);
  const isUrgent = daysAgo >= 3;

  return (
    <Card
      className="p-5 hover:shadow-lg transition-shadow cursor-pointer border-l-4"
      style={{
        borderLeftColor: isUrgent ? '#EF4444' : '#3B82F6',
      }}
      onClick={() => router.push(`/strategic/strategies/${strategy.id}/approve`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Title className="text-lg">{strategy.name}</Title>
            {strategy.versionName && (
              <Text className="text-sm text-gray-500">({strategy.versionName})</Text>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={getVersionTypeColor(strategy.versionType)}>
              {getVersionTypeLabel(strategy.versionType)}
            </Badge>
            <Badge variant={isUrgent ? 'destructive' : 'info'}>
              PENDENTE
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4" />
              <Text>Submetido por: Usuário #{strategy.submittedByUserId}</Text>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <Text>Data: {formatDate(strategy.submittedAt)}</Text>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Text className={isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'}>
                Aguardando há: {daysAgo} {daysAgo === 1 ? 'dia' : 'dias'}
              </Text>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/strategic/strategies/${strategy.id}/approve`);
            }}
            className="flex items-center gap-2"
          >
            Revisar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
