/**
 * Component: SubmissionStatusBadge
 * Badge visual para status de submissão
 * 
 * @module app/(dashboard)/strategic/approvals/components
 */
"use client";

import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SubmissionStatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | string;
}

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  className: string;
}> = {
  PENDING: {
    label: 'Pendente',
    variant: 'outline',
    icon: <Clock className="w-3 h-3" />,
    className: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  },
  PENDING_APPROVAL: {
    label: 'Pendente',
    variant: 'outline',
    icon: <Clock className="w-3 h-3" />,
    className: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  },
  APPROVED: {
    label: 'Aprovada',
    variant: 'default',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'border-green-500/50 text-green-400 bg-green-500/10',
  },
  REJECTED: {
    label: 'Rejeitada',
    variant: 'destructive',
    icon: <XCircle className="w-3 h-3" />,
    className: 'border-red-500/50 text-red-400 bg-red-500/10',
  },
  CHANGES_REQUESTED: {
    label: 'Alterações Solicitadas',
    variant: 'outline',
    icon: <RefreshCw className="w-3 h-3" />,
    className: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10',
  },
};

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <Badge 
      variant={config.variant}
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
