'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, XCircle, MapPin, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUp {
  id: string;
  followUpNumber: number;
  followUpDate: string;
  gembaLocal: string;
  gembutsuObservation: string;
  genjitsuData: string;
  executionStatus: 'EXECUTED_OK' | 'EXECUTED_PARTIAL' | 'NOT_EXECUTED' | 'BLOCKED';
  executionPercent: number;
  problemsObserved?: string;
  problemSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresNewPlan?: boolean;
  childActionPlanId?: string;
  verifiedBy: string;
  verifiedAt: string | null;
  evidenceUrls?: string[];
}

interface FollowUpTimelineProps {
  followUps: FollowUp[];
  className?: string;
}

const STATUS_CONFIG = {
  EXECUTED_OK: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-l-green-500',
    label: 'Executado OK',
  },
  EXECUTED_PARTIAL: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-l-blue-500',
    label: 'Executado Parcialmente',
  },
  NOT_EXECUTED: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-l-gray-300',
    label: 'Não Executado',
  },
  BLOCKED: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-l-red-500',
    label: 'Bloqueado',
  },
} as const;

const SEVERITY_CONFIG = {
  LOW: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Baixa' },
  MEDIUM: { color: 'bg-orange-500/20 text-orange-400', label: 'Média' },
  HIGH: { color: 'bg-red-500/20 text-red-400', label: 'Alta' },
  CRITICAL: { color: 'bg-red-600/20 text-red-300', label: 'Crítica' },
} as const;

export function FollowUpTimeline({ followUps, className }: FollowUpTimelineProps) {
  if (followUps.length === 0) {
    return (
      <Card className={cn('p-8 text-center bg-gray-900/50 border-gray-800', className)}>
        <Circle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white/70 mb-2">
          Nenhum acompanhamento registrado
        </h3>
        <p className="text-sm text-white/50">
          Clique no botão + para criar o primeiro follow-up 3G deste plano de ação.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {followUps.map((item, index) => {
        const config = STATUS_CONFIG[item.executionStatus];
        const Icon = config.icon;

        return (
          <Card
            key={item.id}
            className={cn(
              'border-l-4 p-4 transition-all hover:shadow-md bg-gray-900/30 border-gray-800',
              config.borderColor
            )}
          >
            <div className="flex items-start gap-4">
              {/* Número da Sequência + Ícone */}
              <div className="flex flex-col items-center space-y-2">
                <div className={cn('p-2 rounded-full', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-white/50 font-medium">#{item.followUpNumber}</span>
                  {index < followUps.length - 1 && (
                    <div className="w-px h-8 bg-white/10 mt-2" />
                  )}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white text-base">
                        Acompanhamento #{item.followUpNumber}
                      </h4>
                      <span className="text-xs text-white/50">
                        {new Date(item.followUpDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-white/60">
                      Verificado por: {item.verifiedBy}
                    </p>
                  </div>
                  <Badge className={cn(config.bgColor, config.color, 'border-0')}>
                    {config.label}
                  </Badge>
                </div>

                {/* 3G Information - Grid layout for full-width */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-blue-300 font-medium">GEMBA (Local)</span>
                        <p className="text-sm text-white/80 mt-1">{item.gembaLocal}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-purple-300 font-medium">GEMBUTSU (Observacao)</span>
                        <p className="text-sm text-white/80 mt-1">{item.gembutsuObservation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-green-300 font-medium">GENJITSU (Dados/Fatos)</span>
                        <p className="text-sm text-white/80 mt-1">{item.genjitsuData}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        item.executionPercent >= 80 ? 'bg-green-500' :
                        item.executionPercent >= 50 ? 'bg-blue-500' :
                        'bg-yellow-500'
                      )}
                      style={{ width: `${item.executionPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white/70 min-w-[50px] text-right">
                    {item.executionPercent}%
                  </span>
                </div>

                {/* Problems Observed */}
                {item.problemsObserved && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-amber-300 font-medium">Problemas Observados:</span>
                      {item.problemSeverity && (
                        <Badge className={cn('text-xs', SEVERITY_CONFIG[item.problemSeverity].color)}>
                          Severidade: {SEVERITY_CONFIG[item.problemSeverity].label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/70 mt-1 italic">
                      &ldquo;{item.problemsObserved}&rdquo;
                    </p>
                  </div>
                )}

                {/* Requires New Plan */}
                {item.requiresNewPlan && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <span className="text-xs text-red-300 font-medium">⚠️ Requer Novo Plano de Ação</span>
                    {item.childActionPlanId && (
                      <p className="text-xs text-white/60 mt-1">
                        Plano criado: {item.childActionPlanId}
                      </p>
                    )}
                  </div>
                )}

                {/* Evidence URLs */}
                {item.evidenceUrls && item.evidenceUrls.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <FileText className="h-3 w-3" />
                    <span>{item.evidenceUrls.length} evidência(s) anexada(s)</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
