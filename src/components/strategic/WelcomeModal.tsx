/**
 * WelcomeModal
 * Modal de boas-vindas para primeira visita
 * 
 * @module strategic/components
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, LineChart, RotateCcw, Trophy, Bot, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

const features = [
  { icon: Target, label: 'Gerencie KPIs e metas', color: 'text-blue-400' },
  { icon: LineChart, label: 'Acompanhe planos de ação', color: 'text-green-400' },
  { icon: RotateCcw, label: 'Implemente ciclos PDCA', color: 'text-yellow-400' },
  { icon: Trophy, label: 'Conquiste badges', color: 'text-purple-400' },
  { icon: Bot, label: 'Receba insights da Aurora AI', color: 'text-pink-400' },
];

export function WelcomeModal() {
  const { isFirstVisit, isHydrated, startTour, dismissWelcome } = useOnboarding();

  // Não renderizar até hidratar ou se não é primeira visita
  if (!isHydrated || !isFirstVisit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] 
          flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 
            shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Gradient header */}
          <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

          {/* Content */}
          <div className="p-8 text-center">
            {/* Logo/Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl 
              bg-gradient-to-br from-purple-500 to-pink-500 
              flex items-center justify-center">
              <Sparkles size={40} className="text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Bem-vindo ao AuraCore Strategic!
            </h1>
            <p className="text-white/60 mb-8">
              Seu sistema de gestão estratégica inteligente
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <Icon size={20} className={feature.color} />
                    <span className="text-white/80">{feature.label}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={dismissWelcome}
                className="flex-1 px-6 py-3 rounded-xl bg-white/10 text-white/70 
                  hover:bg-white/20 transition-all"
              >
                Pular
              </button>
              <button
                onClick={startTour}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r 
                  from-purple-500 to-pink-500 text-white font-medium 
                  hover:from-purple-600 hover:to-pink-600 transition-all
                  flex items-center justify-center gap-2"
              >
                Iniciar Tour <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
