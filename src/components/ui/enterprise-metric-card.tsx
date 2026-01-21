'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { NumberCounter } from '@/components/ui/magic-components';
import { FadeIn } from '@/components/ui/animated-wrappers';

type MetricVariant = 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'orange';

interface EnterpriseMetricCardProps {
  icon: ReactNode;
  badge?: string;
  badgeEmoji?: string;
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  variant?: MetricVariant;
  delay?: number;
  isUrgent?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantConfig: Record<MetricVariant, {
  border: string;
  hoverBorder: string;
  shadow: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  valueBg: string;
}> = {
  purple: {
    border: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-400/50',
    shadow: 'hover:shadow-purple-500/20',
    iconBg: 'from-purple-500/20 to-pink-500/20',
    badgeBg: 'from-purple-500/20 to-pink-500/20',
    badgeText: 'text-purple-300',
    valueBg: 'from-purple-400 to-pink-400',
  },
  green: {
    border: 'border-green-500/30',
    hoverBorder: 'hover:border-green-400/50',
    shadow: 'hover:shadow-green-500/20',
    iconBg: 'from-green-500/20 to-emerald-500/20',
    badgeBg: 'from-green-500/20 to-emerald-500/20',
    badgeText: 'text-green-300',
    valueBg: 'from-green-400 to-emerald-400',
  },
  yellow: {
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/50',
    shadow: 'hover:shadow-amber-500/20',
    iconBg: 'from-amber-500/20 to-yellow-500/20',
    badgeBg: 'from-amber-500/20 to-yellow-500/20',
    badgeText: 'text-amber-300',
    valueBg: 'from-amber-400 to-yellow-400',
  },
  red: {
    border: 'border-red-500/30',
    hoverBorder: 'hover:border-red-400/50',
    shadow: 'hover:shadow-red-500/20',
    iconBg: 'from-red-500/20 to-rose-500/20',
    badgeBg: 'from-red-500/20 to-rose-500/20',
    badgeText: 'text-red-300',
    valueBg: 'from-red-400 to-rose-400',
  },
  blue: {
    border: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-400/50',
    shadow: 'hover:shadow-blue-500/20',
    iconBg: 'from-blue-500/20 to-cyan-500/20',
    badgeBg: 'from-blue-500/20 to-cyan-500/20',
    badgeText: 'text-blue-300',
    valueBg: 'from-blue-400 to-cyan-400',
  },
  orange: {
    border: 'border-orange-500/30',
    hoverBorder: 'hover:border-orange-400/50',
    shadow: 'hover:shadow-orange-500/20',
    iconBg: 'from-orange-500/20 to-amber-500/20',
    badgeBg: 'from-orange-500/20 to-amber-500/20',
    badgeText: 'text-orange-300',
    valueBg: 'from-orange-400 to-amber-400',
  },
};

export function EnterpriseMetricCard({
  icon,
  badge,
  badgeEmoji,
  title,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  variant = 'purple',
  delay = 0.2,
  isUrgent = false,
  onClick,
  className,
}: EnterpriseMetricCardProps) {
  const config = variantConfig[variant];

  return (
    <FadeIn delay={delay}>
      <GlassmorphismCard 
        className={cn(
          config.border,
          config.hoverBorder,
          'transition-all hover:shadow-lg',
          config.shadow,
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        <div className={cn(
          'p-6',
          `bg-gradient-to-br from-${variant}-900/10 to-${variant}-800/5`
        )}>
          {/* Header with icon and badge */}
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              'p-3 rounded-xl shadow-inner bg-gradient-to-br',
              config.iconBg,
              isUrgent && 'animate-pulse'
            )}>
              {icon}
            </div>
            
            {badge && (
              <span className={cn(
                'text-xs font-semibold px-3 py-1 rounded-full border',
                'bg-gradient-to-r',
                config.badgeBg,
                config.badgeText,
                `border-${variant}-400/30`,
                isUrgent && 'animate-pulse'
              )}>
                {badgeEmoji && `${badgeEmoji} `}{badge}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>

          {/* Value */}
          <div className={cn(
            'text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r',
            config.valueBg
          )}>
            {prefix}<NumberCounter value={value} />{suffix}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
          )}
        </div>
      </GlassmorphismCard>
    </FadeIn>
  );
}
