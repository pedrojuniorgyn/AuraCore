/**
 * VoiceChatButton - Botão de chat por voz com indicadores de estado
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Square, 
  Volume2, 
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import type { UseVoiceChatOptions, VoiceState } from '@/types/voice';

interface VoiceChatButtonProps extends UseVoiceChatOptions {
  /** Tamanho do botão */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar tooltip */
  showTooltip?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Mostrar indicador de estado */
  showStateIndicator?: boolean;
}

/**
 * Configuração visual por estado
 */
const STATE_CONFIG: Record<VoiceState, {
  icon: React.ReactNode;
  color: string;
  label: string;
  pulse: boolean;
}> = {
  idle: {
    icon: <Mic className="h-5 w-5" />,
    color: 'bg-violet-500 hover:bg-violet-600',
    label: 'Clique para falar',
    pulse: false,
  },
  listening: {
    icon: <Square className="h-4 w-4" />,
    color: 'bg-red-500 hover:bg-red-600',
    label: 'Gravando... Clique para parar',
    pulse: true,
  },
  processing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    color: 'bg-yellow-500',
    label: 'Processando...',
    pulse: false,
  },
  speaking: {
    icon: <Volume2 className="h-5 w-5" />,
    color: 'bg-green-500 hover:bg-green-600',
    label: 'Falando... Clique para parar',
    pulse: true,
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'bg-red-500',
    label: 'Erro - Tente novamente',
    pulse: false,
  },
};

/**
 * Tamanhos do botão
 */
const SIZE_CONFIG = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

export function VoiceChatButton({
  size = 'md',
  showTooltip = true,
  showStateIndicator = true,
  className,
  ...voiceOptions
}: VoiceChatButtonProps) {
  const {
    state,
    isListening,
    isSpeaking,
    isSupported,
    toggleListening,
    stopSpeaking,
    error,
  } = useVoiceChat(voiceOptions);

  const config = STATE_CONFIG[state];

  const handleClick = (): void => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      toggleListening();
    }
  };

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        title="Voz não suportada neste navegador"
        className={cn(SIZE_CONFIG[size], 'rounded-full', className)}
      >
        <MicOff className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  const button = (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="relative"
    >
      {/* Pulse animation */}
      <AnimatePresence>
        {config.pulse && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            className={cn(
              'absolute inset-0 rounded-full',
              isListening ? 'bg-red-500' : 'bg-green-500'
            )}
          />
        )}
      </AnimatePresence>

      <Button
        variant="default"
        size="icon"
        onClick={handleClick}
        disabled={state === 'processing'}
        title={showTooltip ? (error ? error.message : config.label) : undefined}
        className={cn(
          SIZE_CONFIG[size],
          'rounded-full text-white transition-colors relative z-10',
          config.color,
          className
        )}
      >
        {config.icon}
      </Button>

      {/* State indicator */}
      {showStateIndicator && state !== 'idle' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background',
            isListening && 'bg-red-500',
            state === 'processing' && 'bg-yellow-500',
            isSpeaking && 'bg-green-500',
            state === 'error' && 'bg-red-500'
          )}
        />
      )}
    </motion.div>
  );

  return button;
}
