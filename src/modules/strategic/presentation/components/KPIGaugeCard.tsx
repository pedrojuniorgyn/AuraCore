'use client';

/**
 * Componente: KPIGaugeCard
 * Card com gauge para visualização de KPI
 * 
 * @module strategic/presentation/components
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KPIGaugeCardProps {
  code: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  trend?: 'UP' | 'DOWN' | 'STABLE';
  polarity?: 'UP' | 'DOWN';
  onClick?: () => void;
}

const statusConfig = {
  GREEN: { color: 'bg-emerald-500', label: 'No Alvo', badgeVariant: 'default' as const },
  YELLOW: { color: 'bg-amber-500', label: 'Atenção', badgeVariant: 'secondary' as const },
  RED: { color: 'bg-red-500', label: 'Crítico', badgeVariant: 'destructive' as const },
};

const trendIcons = {
  UP: '↑',
  DOWN: '↓',
  STABLE: '→',
};

export function KPIGaugeCard({
  code,
  name,
  value,
  target,
  unit,
  status,
  trend,
  polarity = 'UP',
  onClick,
}: KPIGaugeCardProps) {
  // Calcular percentual de atingimento
  const percent = target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const displayPercent = Math.round(percent);

  // Calcular rotação do gauge (180 graus = 100%)
  const rotation = Math.min((percent / 100) * 180, 180);

  const config = statusConfig[status];

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-200',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{code}</p>
            <CardTitle className="text-sm font-medium">{name}</CardTitle>
          </div>
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Gauge SVG */}
        <div className="relative flex justify-center my-4">
          <svg
            viewBox="0 0 200 110"
            className="w-full max-w-[200px]"
          >
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * Math.min(percent, 100)) / 100}
              className={cn(
                status === 'GREEN' && 'text-emerald-500',
                status === 'YELLOW' && 'text-amber-500',
                status === 'RED' && 'text-red-500'
              )}
            />
            {/* Needle */}
            <g transform={`rotate(${rotation - 90}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke="#374151"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="6" fill="#374151" />
            </g>
            {/* Center value */}
            <text
              x="100"
              y="85"
              textAnchor="middle"
              className="text-2xl font-bold fill-current"
            >
              {displayPercent}%
            </text>
          </svg>
        </div>

        {/* Values */}
        <div className="flex justify-center">
          <div className="text-center">
            <span className="text-2xl font-bold">
              {value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Meta: {target.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {unit}
          </span>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium flex items-center gap-1',
                trend === 'UP' && polarity === 'UP' && 'text-emerald-600',
                trend === 'DOWN' && polarity === 'DOWN' && 'text-emerald-600',
                trend === 'UP' && polarity === 'DOWN' && 'text-red-600',
                trend === 'DOWN' && polarity === 'UP' && 'text-red-600',
                trend === 'STABLE' && 'text-muted-foreground'
              )}
            >
              {trendIcons[trend]} Tendência
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
