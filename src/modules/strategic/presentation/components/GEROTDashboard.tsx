'use client';

/**
 * Componente: GEROTDashboard
 * Dashboard de Gerenciamento da Rotina (Metodologia Falconi)
 * 
 * @module strategic/presentation/components
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp 
} from 'lucide-react';

// Componente Progress simplificado
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', className)}>
      <div 
        className="bg-primary h-full rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

interface ControlItemSummary {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  processArea: string;
}

interface AnomalySummary {
  id: string;
  code: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  daysOpen: number;
  processArea: string;
}

interface GEROTStats {
  totalIC: number;
  icOK: number;
  icWarning: number;
  icCritical: number;
  openAnomalies: number;
  avgResolutionDays: number;
}

interface GEROTDashboardProps {
  controlItems: ControlItemSummary[];
  anomalies: AnomalySummary[];
  stats: GEROTStats;
  onControlItemClick?: (id: string) => void;
  onAnomalyClick?: (id: string) => void;
}

const statusConfig = {
  OK: { color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  WARNING: { color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
  CRITICAL: { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
};

const severityConfig = {
  LOW: { variant: 'secondary' as const, label: 'Baixa' },
  MEDIUM: { variant: 'default' as const, label: 'Média' },
  HIGH: { variant: 'destructive' as const, label: 'Alta' },
  CRITICAL: { variant: 'destructive' as const, label: 'Crítica' },
};

export function GEROTDashboard({
  controlItems,
  anomalies,
  stats,
  onControlItemClick,
  onAnomalyClick,
}: GEROTDashboardProps) {
  const icOKPercent = stats.totalIC > 0 ? Math.round((stats.icOK / stats.totalIC) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GEROT</h2>
          <p className="text-muted-foreground">
            Gerenciamento da Rotina - Metodologia Falconi
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IC</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIC}</div>
            <p className="text-xs text-muted-foreground">Itens de Controle</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IC OK</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.icOK}</div>
            <Progress value={icOKPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{icOKPercent}% no alvo</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalias Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openAnomalies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.icCritical} críticos + {stats.icWarning} alertas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Resolução</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionDays}</div>
            <p className="text-xs text-muted-foreground">dias em média</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Itens de Controle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Itens de Controle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {controlItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item de controle cadastrado
              </p>
            ) : (
              controlItems.map((ic) => {
                const config = statusConfig[ic.status];
                const progress = ic.targetValue > 0 
                  ? Math.min((ic.currentValue / ic.targetValue) * 100, 100) 
                  : 0;

                return (
                  <div
                    key={ic.id}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                      config.bgLight
                    )}
                    onClick={() => onControlItemClick?.(ic.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', config.color)} />
                        <span className="font-mono text-sm font-semibold">{ic.code}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ic.processArea}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{ic.name}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn('font-semibold', config.textColor)}>
                        {ic.currentValue} / {ic.targetValue} {ic.unit}
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="mt-1 h-1" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Anomalias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Anomalias Abertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Nenhuma anomalia aberta</span>
              </div>
            ) : (
              anomalies.map((anomaly) => {
                const sevConfig = severityConfig[anomaly.severity];

                return (
                  <div
                    key={anomaly.id}
                    className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-amber-300"
                    onClick={() => onAnomalyClick?.(anomaly.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={sevConfig.variant} className="text-xs">
                          {sevConfig.label}
                        </Badge>
                        <span className="font-mono text-sm font-semibold">
                          {anomaly.code}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {anomaly.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 mb-2">
                      {anomaly.title}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{anomaly.processArea}</span>
                      <span className={cn(
                        anomaly.daysOpen > 7 && 'text-red-500 font-semibold'
                      )}>
                        {anomaly.daysOpen} dias
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
