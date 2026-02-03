/**
 * Component: ApprovalCard
 * Card de estratégia pendente de aprovação com ações inline
 * 
 * @module app/(dashboard)/strategic/approvals/components
 */
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, User, Calendar, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/animated-wrappers';
import { ApprovalActionDialog } from './ApprovalActionDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PendingApproval } from '../hooks/useApprovals';

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: () => void;
  onReject: () => void;
  delay?: number;
}

export function ApprovalCard({ approval, onApprove, onReject, delay = 0 }: ApprovalCardProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'requestChanges' | null>(null);

  const timeAgo = formatDistanceToNow(new Date(approval.submittedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleViewDetails = () => {
    router.push(`/strategic/strategies/${approval.strategyId}/approve`);
  };

  return (
    <>
      <FadeIn delay={delay}>
        <div 
          className={`
            bg-gradient-to-br from-gray-800/50 to-gray-900/50 
            border rounded-lg p-6 
            hover:shadow-lg hover:shadow-purple-500/10 
            transition-all cursor-pointer
            ${approval.isUrgent ? 'border-red-500/50 hover:border-red-400/70' : 'border-gray-700 hover:border-purple-500/50'}
          `}
          onClick={handleViewDetails}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="text-lg font-medium text-gray-100">
                  {approval.strategyTitle}
                </h3>
                <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                  <Clock className="w-3 h-3 mr-1" />
                  Pendente
                </Badge>
                {approval.isUrgent && (
                  <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Urgente
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-2">
                Código: <span className="font-mono text-gray-300">{approval.strategyCode}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
              className="text-gray-400 hover:text-gray-100"
            >
              Ver detalhes
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-6 mb-4 text-sm text-gray-400 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Submetida por: <span className="text-gray-300">{approval.submittedBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className={approval.isUrgent ? 'text-red-400 font-medium' : ''}>{timeAgo}</span>
            </div>
            {approval.daysAgo > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className={approval.isUrgent ? 'text-red-400' : ''}>
                  {approval.daysAgo} {approval.daysAgo === 1 ? 'dia' : 'dias'} aguardando
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={() => setActionType('approve')}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
            <Button
              onClick={() => setActionType('requestChanges')}
              variant="outline"
              className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Solicitar Alterações
            </Button>
            <Button
              onClick={() => setActionType('reject')}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </div>
        </div>
      </FadeIn>

      <ApprovalActionDialog
        isOpen={actionType !== null}
        onClose={() => setActionType(null)}
        strategyId={approval.strategyId}
        strategyTitle={approval.strategyTitle}
        actionType={actionType || 'approve'}
        onSuccess={() => {
          setActionType(null);
          if (actionType === 'approve') onApprove();
          else onReject();
        }}
      />
    </>
  );
}
