'use client';

import { ReactNode } from 'react';
import { FileQuestion, Plus } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  const ActionWrapper = actionHref ? 'a' : 'div';

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16',
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
        {icon || <FileQuestion size={32} className="text-white/30" />}
      </div>
      
      <h3 className="text-white/70 text-lg font-medium">{title}</h3>
      
      {description && (
        <p className="text-white/40 text-sm mt-1 text-center max-w-sm">
          {description}
        </p>
      )}
      
      {actionLabel && (onAction || actionHref) && (
        <ActionWrapper
          href={actionHref}
          onClick={onAction}
          className="mt-4"
        >
          <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
            <Plus size={16} className="mr-2" />
            {actionLabel}
          </RippleButton>
        </ActionWrapper>
      )}
    </div>
  );
}
