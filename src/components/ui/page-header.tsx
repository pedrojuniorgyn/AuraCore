'use client';

import { ReactNode } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RippleButton } from '@/components/ui/ripple-button';
import { FadeIn } from '@/components/ui/animated-wrappers';

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  recordCount?: number;
  showBack?: boolean;
  actions?: ReactNode;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function PageHeader({
  icon,
  title,
  description,
  recordCount,
  showBack = false,
  actions,
  onRefresh,
  isLoading,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <FadeIn delay={0.1}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        {/* Left side */}
        <div className="flex items-start gap-4">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="mt-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
          )}
          
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient flex items-center gap-3">
              {icon && <span className="text-3xl">{icon}</span>}
              {title}
            </h1>
            {description && (
              <p className="text-slate-400">
                {description}
                {recordCount !== undefined && ` (${recordCount} registros)`}
              </p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {onRefresh && (
            <RippleButton
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
              Atualizar
            </RippleButton>
          )}
          {actions}
        </div>
      </div>
    </FadeIn>
  );
}
