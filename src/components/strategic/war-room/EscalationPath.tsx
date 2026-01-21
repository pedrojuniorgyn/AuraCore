'use client';

import { motion } from 'framer-motion';
import { ArrowUp, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EscalationLevel } from '@/lib/war-room/war-room-types';
import { ESCALATION_LEVELS } from '@/lib/war-room/war-room-types';

interface Props {
  currentLevel: EscalationLevel;
  nextEscalationAt?: Date;
  onEscalate: () => void;
  canEscalate: boolean;
}

const LEVELS_ORDER: EscalationLevel[] = ['N1', 'N2', 'N3', 'N4', 'DIR'];

export function EscalationPath({
  currentLevel,
  nextEscalationAt,
  onEscalate,
  canEscalate,
}: Props) {
  const currentIndex = LEVELS_ORDER.indexOf(currentLevel);
  const nextLevel = LEVELS_ORDER[currentIndex + 1];

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <h3 className="text-white font-medium mb-4">Escalação</h3>

      {/* Visual path */}
      <div className="flex items-center justify-between mb-6">
        {LEVELS_ORDER.map((level, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = level === currentLevel;

          return (
            <div key={level} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isActive ? '#a855f7' : '#1f2937',
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center
                  border-2 transition-colors relative
                  ${isActive ? 'border-purple-500' : 'border-white/20'}`}
              >
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {level}
                </span>

                {isCurrent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full 
                      bg-red-500 animate-pulse"
                  />
                )}
              </motion.div>

              {index < LEVELS_ORDER.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 transition-colors
                    ${index < currentIndex ? 'bg-purple-500' : 'bg-white/10'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current level info */}
      <div className="mb-4">
        <p className="text-white/60 text-sm">Nível Atual</p>
        <p className="text-white font-medium">{ESCALATION_LEVELS[currentLevel].label}</p>
        <p className="text-white/40 text-xs mt-1">
          {ESCALATION_LEVELS[currentLevel].description}
        </p>
      </div>

      {/* Next escalation */}
      {nextEscalationAt && nextLevel && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 
          border border-yellow-500/30 mb-4"
        >
          <Clock size={16} className="text-yellow-400" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">
              Escalação automática para {nextLevel}
            </p>
            <p className="text-yellow-400/60 text-xs">
              em {formatDistanceToNow(new Date(nextEscalationAt), { locale: ptBR })}
            </p>
          </div>
        </div>
      )}

      {/* Escalate button */}
      {canEscalate && nextLevel && (
        <button
          onClick={onEscalate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 
            rounded-xl bg-red-500/20 border border-red-500/30 text-red-400
            hover:bg-red-500/30 transition-colors"
        >
          <ArrowUp size={16} />
          Escalar para {nextLevel}
        </button>
      )}

      {currentLevel === 'DIR' && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 
          border border-purple-500/30"
        >
          <AlertTriangle size={16} className="text-purple-400" />
          <p className="text-purple-400 text-sm">Máximo nível de escalação atingido</p>
        </div>
      )}
    </div>
  );
}
