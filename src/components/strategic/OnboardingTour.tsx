/**
 * OnboardingTour
 * Tour guiado interativo com spotlight nos elementos
 * 
 * @module strategic/components
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TourTooltip } from './TourTooltip';
import { useOnboarding } from '@/hooks/useOnboarding';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

const defaultTourSteps: TourStep[] = [
  {
    id: 'health-score',
    target: '[data-tour="health-score"]',
    title: '📊 Health Score',
    content: 'Este indicador mostra a saúde geral da sua estratégia, baseado no desempenho de todos os KPIs. Verde = ótimo, Vermelho = atenção necessária.',
    position: 'bottom',
  },
  {
    id: 'alerts',
    target: '[data-tour="alerts"]',
    title: '🚨 Alertas Críticos',
    content: 'Aqui você vê os KPIs que precisam de atenção imediata. Clique em qualquer alerta para ver detalhes e criar um plano de ação.',
    position: 'bottom',
  },
  {
    id: 'kpi-summary',
    target: '[data-tour="kpi-summary"]',
    title: '🎯 Perspectivas BSC',
    content: 'Visualize o desempenho por perspectiva do Balanced Scorecard: Financeira, Clientes, Processos Internos e Aprendizado.',
    position: 'top',
  },
  {
    id: 'actions',
    target: '[data-tour="actions"]',
    title: '✅ Planos de Ação',
    content: 'Acompanhe suas ações prioritárias. Use a metodologia 5W2H para criar planos estruturados e efetivos.',
    position: 'left',
  },
  {
    id: 'aurora-insight',
    target: '[data-tour="aurora-insight"]',
    title: '🤖 Aurora AI',
    content: 'Nossa inteligência artificial analisa seus dados e oferece insights personalizados para melhorar sua estratégia.',
    position: 'top',
  },
  {
    id: 'customize',
    target: '[data-tour="customize"]',
    title: '⚙️ Personalize',
    content: 'Clique aqui para personalizar seu dashboard. Arraste widgets, adicione novos ou remova os que não precisa.',
    position: 'left',
  },
  {
    id: 'sidebar-nav',
    target: '[data-tour="sidebar"]',
    title: '📍 Navegação',
    content: 'Use o menu lateral para acessar todas as funcionalidades: War Room, BSC, Planos de Ação, PDCA, Relatórios e mais.',
    position: 'right',
  },
];

interface Props {
  steps?: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({ steps = defaultTourSteps, onComplete, onSkip }: Props) {
  const { isTourActive, currentStep, completeTour, skipTour, nextStep, prevStep } = useOnboarding();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStepData = steps[currentStep];

  // Encontrar e destacar elemento alvo
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    const findTarget = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll suave para o elemento
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Se não encontrou, tentar próximo step
        setTargetRect(null);
      }
    };

    // Delay para dar tempo do DOM renderizar
    const timeoutId = setTimeout(findTarget, 100);

    // Atualizar posição no resize
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget);
    };
  }, [isTourActive, currentStep, currentStepData]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      nextStep();
    } else {
      completeTour();
      onComplete?.();
    }
  }, [currentStep, steps.length, nextStep, completeTour, onComplete]);

  const handleSkip = useCallback(() => {
    skipTour();
    onSkip?.();
  }, [skipTour, onSkip]);

  if (!isTourActive || !currentStepData) return null;

  const padding = currentStepData.spotlightPadding ?? 8;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
      >
        {/* Overlay com buraco para spotlight */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Borda do spotlight */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-2 border-purple-500 rounded-xl pointer-events-none"
            style={{
              left: targetRect.left - padding,
              top: targetRect.top - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3)',
            }}
          />
        )}

        {/* Tooltip */}
        {targetRect && (
          <TourTooltip
            title={currentStepData.title}
            content={currentStepData.content}
            position={currentStepData.position || 'bottom'}
            targetRect={targetRect}
            currentStep={currentStep}
            totalSteps={steps.length}
            onNext={handleNext}
            onPrev={prevStep}
            onSkip={handleSkip}
            isFirst={currentStep === 0}
            isLast={currentStep === steps.length - 1}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
