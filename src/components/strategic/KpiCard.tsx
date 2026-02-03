"use client";

/**
 * KpiCard - Card premium para exibição de KPI com gauge e sparkline
 * Design Aurora com animações e glassmorphism
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, ExternalLink, Minus, Pencil, Trash2, Link as LinkIcon, Target } from 'lucide-react';
import { KpiSparkline } from './KpiSparkline';

type KpiStatus = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_DATA';

export interface KpiData {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: KpiStatus;
  trend: number;
  history: number[];
  variance: number;
  perspective?: string;
  goalId?: string | null;
  sourceModule?: string | null;
  autoCalculate?: boolean;
}

interface Props {
  kpi: KpiData;
  onClick?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_CONFIG: Record<KpiStatus, {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  icon: typeof CheckCircle;
  label: string;
  pulse?: boolean;
}> = {
  ON_TRACK: {
    color: '#22c55e',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    textColor: 'text-green-400',
    glowColor: 'shadow-green-500/20',
    icon: CheckCircle,
    label: 'No Prazo',
  },
  AT_RISK: {
    color: '#eab308',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/20',
    icon: AlertTriangle,
    label: 'Em Risco',
  },
  CRITICAL: {
    color: '#ef4444',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    glowColor: 'shadow-red-500/20',
    icon: AlertTriangle,
    label: 'Crítico',
    pulse: true,
  },
  NO_DATA: {
    color: '#6b7280',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/50',
    textColor: 'text-gray-400',
    glowColor: '',
    icon: Minus,
    label: 'Sem Dados',
  },
};

function formatValue(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'R$') return `R$ ${(value / 1000000).toFixed(2)}M`;
  if (unit === 'dias') return `${value.toFixed(1)} dias`;
  if (unit === 'pts') return `${value} pts`;
  if (unit === 'h/func') return `${value}h`;
  if (unit === 'un') return `${value} un`;
  return `${value.toLocaleString('pt-BR')} ${unit}`;
}

// ✅ Função de validação de permissões
function canEditDelete(kpi: KpiData): boolean {
  // NÃO pode se derivado de goal
  if (kpi.goalId) return false;
  
  // NÃO pode se vinculado a módulo
  if (kpi.sourceModule) return false;
  
  // NÃO pode se for auto-calculado
  if (kpi.autoCalculate) return false;
  
  return true;
}

// ✅ Função para gerar mensagem explicativa
function getDisabledReason(kpi: KpiData): string {
  if (kpi.goalId) {
    return 'KPI vinculado a objetivo estratégico. Edite pelo objetivo.';
  }
  if (kpi.sourceModule) {
    return `KPI vinculado ao módulo "${kpi.sourceModule}". Edite pelo módulo de origem.`;
  }
  if (kpi.autoCalculate) {
    return 'KPI com cálculo automático. Apenas KPIs manuais podem ser editados.';
  }
  return 'KPI não pode ser editado.';
}

// Componente Gauge circular animado
function GaugeCircle({ 
  percentage, 
  status, 
  size = 100 
}: { 
  percentage: number; 
  status: KpiStatus; 
  size?: number;
}) {
  const config = STATUS_CONFIG[status];
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (circumference * clampedPercentage) / 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${config.color}40)` }}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={config.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-white"
        >
          {Math.round(clampedPercentage)}
        </motion.span>
        <span className="text-xs text-white/50">%</span>
      </div>
    </div>
  );
}

export function KpiCard({ kpi, onClick, onEdit, onDelete }: Props) {
  const config = STATUS_CONFIG[kpi.status];
  const StatusIcon = config.icon;
  const percentage = kpi.targetValue !== 0 
    ? (kpi.currentValue / kpi.targetValue) * 100 
    : 0;
  
  const canEdit = canEditDelete(kpi);
  const disabledReason = !canEdit ? getDisabledReason(kpi) : '';

  const handleCardClick = (e: React.MouseEvent) => {
    // Não navegar se clicar nos botões de ação
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onClick?.(kpi.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(kpi.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(kpi.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={handleCardClick}
      className={`
        relative p-5 rounded-2xl cursor-pointer overflow-hidden
        bg-white/5 border border-white/10 backdrop-blur-xl
        transition-all duration-300
        hover:bg-white/10 hover:shadow-xl ${config.glowColor}
        ${config.pulse ? 'animate-pulse' : ''}
      `}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${config.color}10 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono text-white/40 bg-white/10 px-2 py-0.5 rounded">
            {kpi.code}
          </span>
          <h3 className="text-white font-medium mt-2 line-clamp-2 text-sm leading-tight">
            {kpi.name}
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 ml-2
          ${config.bgColor} ${config.textColor} text-xs`}>
          <StatusIcon className="w-3 h-3" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Gauge */}
      <div className="flex justify-center mb-4 relative">
        <GaugeCircle percentage={percentage} status={kpi.status} />
      </div>

      {/* Values */}
      <div className="space-y-2 mb-4 relative">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Meta:</span>
          <span className="text-white font-medium">
            {formatValue(kpi.targetValue, kpi.unit)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Atual:</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {formatValue(kpi.currentValue, kpi.unit)}
            </span>
            <span className={`text-xs flex items-center gap-0.5 ${
              kpi.variance >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {kpi.variance >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {kpi.variance >= 0 ? '+' : ''}{kpi.variance}%
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="pt-3 border-t border-white/10 relative">
        <KpiSparkline 
          data={kpi.history} 
          trend={kpi.trend} 
          status={kpi.status} 
        />
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="pt-3 mt-3 border-t border-white/10 relative">
          {canEdit ? (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 
                    rounded-lg bg-blue-500/20 hover:bg-blue-500/30 
                    text-blue-400 hover:text-blue-300 text-xs font-medium
                    transition-colors duration-200"
                  title="Editar KPI"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 
                    rounded-lg bg-red-500/20 hover:bg-red-500/30 
                    text-red-400 hover:text-red-300 text-xs font-medium
                    transition-colors duration-200"
                  title="Excluir KPI"
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </button>
              )}
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 text-white/40 text-xs cursor-help"
              title={disabledReason}
            >
              {kpi.goalId && <Target className="w-3 h-3" />}
              {kpi.sourceModule && <LinkIcon className="w-3 h-3" />}
              <span className="flex-1 truncate">
                {kpi.goalId && 'Vinculado a Objetivo'}
                {kpi.sourceModule && `Vinculado a ${kpi.sourceModule}`}
                {!kpi.goalId && !kpi.sourceModule && kpi.autoCalculate && 'Cálculo Automático'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* External link indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-white/20" />
      </div>
    </motion.div>
  );
}
