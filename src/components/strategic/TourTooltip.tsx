/**
 * TourTooltip
 * Tooltip flutuante para o tour guiado com navegação
 * 
 * @module strategic/components
 */
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  targetRect: DOMRect;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function TourTooltip({
  title,
  content,
  position,
  targetRect,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: Props) {
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const gap = 16;

  const tooltipPosition = useMemo(() => {
    const positions = {
      top: {
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        top: targetRect.top - tooltipHeight - gap,
      },
      bottom: {
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        top: targetRect.bottom + gap,
      },
      left: {
        left: targetRect.left - tooltipWidth - gap,
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      },
      right: {
        left: targetRect.right + gap,
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      },
    };

    const pos = { ...positions[position] };

    // Ajustar se sair da tela
    if (pos.left < 16) pos.left = 16;
    if (pos.left + tooltipWidth > window.innerWidth - 16) {
      pos.left = window.innerWidth - tooltipWidth - 16;
    }
    if (pos.top < 16) pos.top = 16;
    if (pos.top + tooltipHeight > window.innerHeight - 16) {
      pos.top = window.innerHeight - tooltipHeight - 16;
    }

    return pos;
  }, [position, targetRect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      style={{
        position: 'fixed',
        left: tooltipPosition.left,
        top: tooltipPosition.top,
        width: tooltipWidth,
      }}
      className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
        shadow-2xl overflow-hidden z-[10000]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button
          onClick={onSkip}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          aria-label="Fechar tour"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <p className="text-white/70 text-sm leading-relaxed">{content}</p>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentStep 
                  ? 'bg-purple-500 w-4' 
                  : i < currentStep 
                    ? 'bg-purple-500/50 w-2' 
                    : 'bg-white/20 w-2'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="px-3 py-1.5 rounded-lg text-sm text-white/60 
              hover:text-white hover:bg-white/10 disabled:opacity-30 
              disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white"
          >
            Pular tour
          </button>

          <button
            onClick={onNext}
            className="px-4 py-1.5 rounded-lg text-sm bg-purple-500 text-white 
              hover:bg-purple-600 flex items-center gap-1"
          >
            {isLast ? 'Concluir' : 'Próximo'} 
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
