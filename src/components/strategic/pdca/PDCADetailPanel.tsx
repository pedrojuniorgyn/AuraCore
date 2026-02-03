'use client';

import { useEffect, useState } from 'react';
import type { IDetailCellRendererParams } from 'ag-grid-community';
import { Calendar, User, CheckCircle, Circle, Clock } from 'lucide-react';

interface PhaseHistoryItem {
  phase: string;
  phaseLabel: string;
  startDate: string | Date;
  endDate: string | Date | null;
  durationDays: number;
  responsible: string;
  progress: number;
  actions: string[];
  isCurrentPhase: boolean;
}

export function PDCADetailPanel(props: IDetailCellRendererParams) {
  const [phaseHistory, setPhaseHistory] = useState<PhaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhaseHistory() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/strategic/pdca/${props.data.id}/phase-history`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const { phaseHistory: data } = await response.json();
        setPhaseHistory(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Error fetching phase history:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPhaseHistory();
  }, [props.data.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm text-gray-600">Carregando histórico de fases...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-center">
          <p className="text-sm text-red-800">Erro ao carregar histórico: {error}</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Em andamento';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Cores das fases PDCA
  const getPhaseColor = (phase: string, isCurrentPhase: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      PLAN: {
        bg: 'bg-blue-500',
        border: 'border-blue-500',
        text: 'text-blue-700',
      },
      DO: {
        bg: 'bg-purple-500',
        border: 'border-purple-500',
        text: 'text-purple-700',
      },
      CHECK: {
        bg: 'bg-yellow-500',
        border: 'border-yellow-500',
        text: 'text-yellow-700',
      },
      ACT: {
        bg: 'bg-green-500',
        border: 'border-green-500',
        text: 'text-green-700',
      },
    };
    
    return colors[phase] || { bg: 'bg-gray-500', border: 'border-gray-500', text: 'text-gray-700' };
  };

  return (
    <div className="p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900">
          Ciclo PDCA - {props.data.code}
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {props.data.title}
        </p>
      </div>

      {/* Timeline de Fases */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h5 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Histórico de Fases
          </h5>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {phaseHistory.length} {phaseHistory.length === 1 ? 'fase' : 'fases'} registradas
          </span>
        </div>

        {phaseHistory.length === 0 ? (
          <div className="py-8 text-center">
            <Circle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma fase registrada</p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />

            {/* Items da timeline */}
            <div className="space-y-8">
              {phaseHistory.map((item, index) => {
                const colors = getPhaseColor(item.phase, item.isCurrentPhase);
                
                return (
                  <div key={index} className="relative flex gap-4">
                    {/* Círculo da fase */}
                    <div
                      className={`
                        z-10 flex h-8 w-8 items-center justify-center rounded-full 
                        ${colors.bg} text-white font-semibold text-sm
                        ${item.isCurrentPhase ? 'ring-4 ring-opacity-30 ' + colors.border.replace('border-', 'ring-') : ''}
                      `}
                    >
                      {item.isCurrentPhase ? (
                        <Circle className="h-4 w-4 animate-pulse" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Conteúdo da fase */}
                    <div className="flex-1 pb-8">
                      <div className={`
                        rounded-lg p-5 border-2 transition-all
                        ${item.isCurrentPhase 
                          ? 'bg-blue-50 ' + colors.border + ' shadow-md' 
                          : 'bg-gray-50 border-gray-200'
                        }
                      `}>
                        {/* Header da fase */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h6 className={`text-base font-semibold ${colors.text}`}>
                              {item.phaseLabel}
                              {item.isCurrentPhase && (
                                <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                  Em andamento
                                </span>
                              )}
                            </h6>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.startDate)}</span>
                                {item.endDate && (
                                  <>
                                    <span>→</span>
                                    <span>{formatDate(item.endDate)}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {item.durationDays} {item.durationDays === 1 ? 'dia' : 'dias'}
                              </div>
                            </div>
                          </div>

                          {/* Progresso da fase */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-800">
                              {item.progress}%
                            </div>
                            <div className="text-xs text-gray-500">Progresso</div>
                          </div>
                        </div>

                        {/* Responsável */}
                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{item.responsible}</span>
                        </div>

                        {/* Ações da fase */}
                        {item.actions && item.actions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h6 className="text-sm font-semibold text-gray-700 mb-2">
                              Ações realizadas:
                            </h6>
                            <ul className="space-y-1">
                              {item.actions.map((action, actionIdx) => (
                                <li key={actionIdx} className="flex items-start gap-2 text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      {phaseHistory.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Fase atual: <strong className="text-gray-700">{props.data.currentPhase}</strong>
          </span>
          <span className="text-gray-400">
            {props.data.progress}% concluído
          </span>
        </div>
      )}
    </div>
  );
}
