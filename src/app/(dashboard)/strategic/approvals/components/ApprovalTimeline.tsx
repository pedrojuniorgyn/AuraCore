/**
 * Component: ApprovalTimeline
 * Timeline visual do histórico de aprovações
 * 
 * @module app/(dashboard)/strategic/approvals/components
 */
"use client";

import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  Filter,
  User,
  Calendar,
  MessageSquare,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import type { ApprovalHistoryItem } from '../hooks/useApprovals';

interface ApprovalTimelineProps {
  items: ApprovalHistoryItem[];
  isLoading: boolean;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'SUBMITTED':
    case 'SUBMIT':
      return <Send className="h-5 w-5 text-blue-400" />;
    case 'APPROVED':
    case 'APPROVE':
      return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    case 'REJECTED':
    case 'REJECT':
      return <XCircle className="h-5 w-5 text-red-400" />;
    case 'CHANGES_REQUESTED':
    case 'REQUEST_CHANGES':
      return <RefreshCw className="h-5 w-5 text-yellow-400" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'SUBMITTED':
    case 'SUBMIT':
      return 'Submetida';
    case 'APPROVED':
    case 'APPROVE':
      return 'Aprovada';
    case 'REJECTED':
    case 'REJECT':
      return 'Rejeitada';
    case 'CHANGES_REQUESTED':
    case 'REQUEST_CHANGES':
      return 'Alterações Solicitadas';
    default:
      return action;
  }
};

const getActionColor = (action: string): string => {
  switch (action) {
    case 'APPROVED':
    case 'APPROVE':
      return 'border-green-500/50 text-green-400 bg-green-500/10';
    case 'REJECTED':
    case 'REJECT':
      return 'border-red-500/50 text-red-400 bg-red-500/10';
    case 'CHANGES_REQUESTED':
    case 'REQUEST_CHANGES':
      return 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10';
    case 'SUBMITTED':
    case 'SUBMIT':
      return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    default:
      return 'border-gray-500/50 text-gray-400 bg-gray-500/10';
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

export function ApprovalTimeline({ items, isLoading }: ApprovalTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Filtrar itens
  const filteredItems = items.filter(item => {
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = item.strategyName?.toLowerCase().includes(searchLower);
      const matchesCode = item.strategyCode?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesCode) return false;
    }

    // Filtro de ação
    if (actionFilter !== 'all') {
      const normalizedAction = item.action.replace('ED', '').replace('_', '');
      const normalizedFilter = actionFilter.replace('ED', '').replace('_', '');
      if (!item.action.includes(actionFilter) && normalizedAction !== normalizedFilter) {
        return false;
      }
    }

    // Filtro de data
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          if (diffDays > 1) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
        case 'quarter':
          if (diffDays > 90) return false;
          break;
      }
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <FadeIn>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-300">Filtros:</span>
            </div>

            <div className="flex-1 flex gap-4 flex-wrap">
              {/* Busca */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por estratégia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-600 text-gray-100"
                />
              </div>

              {/* Filtro de Ação */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px] bg-gray-900 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Todas as Ações" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="APPROVED">Aprovações</SelectItem>
                  <SelectItem value="REJECTED">Rejeições</SelectItem>
                  <SelectItem value="CHANGES_REQUESTED">Alterações</SelectItem>
                  <SelectItem value="SUBMITTED">Submissões</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro de Data */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px] bg-gray-900 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Todo o Período" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mês</SelectItem>
                  <SelectItem value="quarter">Último Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Timeline */}
      {filteredItems.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
            <AlertCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-200 mb-2">
              Nenhum registro encontrado
            </h3>
            <p className="text-gray-400">
              {items.length === 0 
                ? 'O histórico de aprovações está vazio.'
                : 'Ajuste os filtros para ver mais resultados.'}
            </p>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer>
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />

            {filteredItems.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.05}>
                <div className="relative pl-14 pb-8">
                  {/* Ícone na timeline */}
                  <div className="absolute left-3 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center">
                    {getActionIcon(item.action)}
                  </div>

                  {/* Card do evento */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <Badge className={getActionColor(item.action)}>
                        {getActionLabel(item.action)}
                      </Badge>
                      <span className="text-gray-100 font-medium">
                        {item.strategyName}
                      </span>
                      {item.strategyCode && (
                        <span className="text-sm text-gray-500 font-mono">
                          ({item.strategyCode})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{item.actorName || `Usuário #${item.actorUserId}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {item.fromStatus && item.toStatus && (
                      <div className="text-sm text-gray-400 mb-3">
                        <span className="font-medium">Transição:</span>{' '}
                        <span className="text-gray-500">{item.fromStatus}</span>
                        {' → '}
                        <span className="text-gray-300">{item.toStatus}</span>
                      </div>
                    )}

                    {item.comments && (
                      <div className="bg-blue-500/10 rounded-lg p-3 text-sm border border-blue-500/20">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{item.comments}</span>
                        </div>
                      </div>
                    )}

                    {item.reason && (
                      <div className="bg-yellow-500/10 rounded-lg p-3 text-sm border border-yellow-500/20 mt-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{item.reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </StaggerContainer>
      )}
    </div>
  );
}
