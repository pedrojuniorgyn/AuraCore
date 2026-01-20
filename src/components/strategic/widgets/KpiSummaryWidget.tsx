'use client';

import { DollarSign, Users, Settings, BookOpen, type LucideIcon } from 'lucide-react';

interface Perspective {
  type: 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL' | 'LEARNING';
  score: number;
  trend: number;
  kpiCount: number;
}

interface Props {
  perspectives: Perspective[];
}

interface PerspectiveConfig {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const perspectiveConfig: Record<Perspective['type'], PerspectiveConfig> = {
  FINANCIAL: { 
    icon: DollarSign, 
    label: 'Financeiro', 
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/20'
  },
  CUSTOMER: { 
    icon: Users, 
    label: 'Cliente', 
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20'
  },
  INTERNAL: { 
    icon: Settings, 
    label: 'Processos', 
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20'
  },
  LEARNING: { 
    icon: BookOpen, 
    label: 'Aprendizado', 
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20'
  },
};

export function KpiSummaryWidget({ perspectives }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
      {perspectives.map((p) => {
        const config = perspectiveConfig[p.type];
        const Icon = config.icon;

        return (
          <div
            key={p.type}
            className={`p-3 rounded-xl ${config.bgClass} border ${config.borderClass}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs truncate">{config.label}</span>
              <Icon size={14} className={config.colorClass} />
            </div>
            <p className={`text-xl font-bold ${config.colorClass}`}>
              {p.score}%
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${p.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {p.trend >= 0 ? '↗' : '↘'} {Math.abs(p.trend)}%
              </p>
              <p className="text-white/40 text-xs">{p.kpiCount} KPIs</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { Perspective as KpiPerspective };
