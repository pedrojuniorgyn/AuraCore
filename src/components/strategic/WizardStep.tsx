"use client";

/**
 * WizardSteps - Componente de steps para wizard 5W2H
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ReactNode } from 'react';

export interface WizardStepConfig {
  id: number;
  key: string;
  icon: ReactNode;
  label: string;
  color: string;
  question: string;
}

interface Props {
  steps: WizardStepConfig[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

// Safelist classes para cores dinâmicas
const COLOR_CLASSES = {
  purple: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500',
    text: 'text-purple-400',
    shadow: 'shadow-purple-500/30',
  },
  blue: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-400',
    shadow: 'shadow-blue-500/30',
  },
  green: {
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-400',
    shadow: 'shadow-green-500/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500',
    text: 'text-orange-400',
    shadow: 'shadow-orange-500/30',
  },
  pink: {
    bg: 'bg-pink-500/20',
    border: 'border-pink-500',
    text: 'text-pink-400',
    shadow: 'shadow-pink-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    shadow: 'shadow-cyan-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    shadow: 'shadow-yellow-500/30',
  },
} as const;

export function WizardSteps({ steps, currentStep, onStepClick }: Props) {
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <div className="mb-8">
      {/* Steps */}
      <div className="flex items-center justify-between relative">
        {/* Connection Line Background */}
        <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-white/10" />
        {/* Connection Line Progress */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100) * 0.9}%` }}
          className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;
          const colorClasses = COLOR_CLASSES[step.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.purple;

          return (
            <motion.button
              key={step.id}
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`
                relative z-10 flex flex-col items-center gap-2
                ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
              `}
            >
              {/* Circle */}
              <motion.div 
                whileHover={isClickable ? { scale: 1.1 } : undefined}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isCurrent 
                      ? `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} shadow-lg ${colorClasses.shadow}`
                      : 'bg-white/5 border-white/20 text-white/40'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-base">{step.icon}</span>
                )}
              </motion.div>

              {/* Label */}
              <span className={`text-xs font-medium transition-colors ${
                isCurrent ? 'text-white' : isCompleted ? 'text-green-400' : 'text-white/40'
              }`}>
                {step.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full"
        />
      </div>
      <p className="text-right text-xs text-white/50 mt-1">
        {Math.round(Math.min(progress, 100))}% completo
      </p>
    </div>
  );
}
