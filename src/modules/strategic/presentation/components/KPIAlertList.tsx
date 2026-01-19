'use client';

/**
 * Componente: KPIAlertList
 * Lista de alertas de KPIs críticos
 * 
 * @module strategic/presentation/components
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Eye, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIAlert {
  id: string;
  kpiCode: string;
  kpiName: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  triggeredAt: Date | string;
  acknowledged: boolean;
}

interface KPIAlertListProps {
  alerts: KPIAlert[];
  onAcknowledge?: (alertId: string) => void;
  onViewKPI?: (kpiCode: string) => void;
  className?: string;
}

const severityConfig = {
  WARNING: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeVariant: 'secondary' as const,
  },
  CRITICAL: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const,
  },
};

export function KPIAlertList({
  alerts,
  onAcknowledge,
  onViewKPI,
  className,
}: KPIAlertListProps) {
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertas de KPIs
          {alerts.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>Nenhum alerta no momento</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  'p-3 rounded-lg border transition-all',
                  config.bgColor,
                  config.borderColor,
                  alert.acknowledged && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.color)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {alert.severity}
                        </Badge>
                        <span className="font-mono text-sm font-semibold">
                          {alert.kpiCode}
                        </span>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Visto
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(alert.triggeredAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!alert.acknowledged && onAcknowledge && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onAcknowledge(alert.id)}
                        title="Marcar como visto"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onViewKPI && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewKPI(alert.kpiCode)}
                        title="Ver KPI"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
