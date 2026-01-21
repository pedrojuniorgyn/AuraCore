/**
 * VoiceChatPanel - Painel completo de chat por voz
 */

'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Volume2, 
  MessageSquare,
  Trash2,
  User,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { VoiceChatButton } from './VoiceChatButton';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import type { UseVoiceChatOptions, VoiceMessage } from '@/types/voice';

interface VoiceChatPanelProps extends UseVoiceChatOptions {
  /** Título do painel */
  title?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Mostrar histórico de mensagens */
  showHistory?: boolean;
}

/**
 * Componente de mensagem de voz
 */
function VoiceMessageBubble({ message }: { message: VoiceMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-2 mb-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[85%]',
          isUser 
            ? 'bg-violet-500 text-white' 
            : 'bg-muted'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          {message.isVoice && (
            <Badge variant="outline" className="text-xs h-5">
              <Mic className="h-3 w-3 mr-1" />
              Voz
            </Badge>
          )}
        </div>
        <p className="text-sm">{message.text}</p>
        <p className="text-xs opacity-60 mt-1">
          {message.timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Painel completo de chat por voz
 */
export function VoiceChatPanel({
  title = 'Chat por Voz',
  showHistory = true,
  className,
  ...voiceOptions
}: VoiceChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    state,
    isListening,
    isProcessing,
    isSpeaking,
    messages,
    lastTranscription,
    error,
    clearMessages,
    isSupported,
  } = useVoiceChat(voiceOptions);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs border-white/30 text-white',
                isListening && 'bg-red-500/20',
                isProcessing && 'bg-yellow-500/20',
                isSpeaking && 'bg-blue-500/20'
              )}
            >
              {state === 'idle' && 'Pronto'}
              {isListening && 'Ouvindo...'}
              {isProcessing && 'Processando...'}
              {isSpeaking && 'Falando...'}
              {state === 'error' && 'Erro'}
            </Badge>
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={clearMessages}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Área de mensagens */}
        {showHistory && (
          <ScrollArea className="h-[200px] p-4" ref={scrollRef}>
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Pressione o botão para falar</p>
                </motion.div>
              ) : (
                messages.map((msg) => (
                  <VoiceMessageBubble key={msg.id} message={msg} />
                ))
              )}
            </AnimatePresence>
          </ScrollArea>
        )}

        {/* Transcrição em tempo real */}
        {isListening && lastTranscription && (
          <div className="px-4 py-2 bg-muted/50 border-t">
            <p className="text-xs text-muted-foreground">Transcrevendo:</p>
            <p className="text-sm italic">{lastTranscription}</p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}

        {/* Área do botão */}
        <div className="p-4 border-t flex items-center justify-center">
          <VoiceChatButton
            size="lg"
            showTooltip={true}
            {...voiceOptions}
          />
        </div>

        {/* Instruções */}
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            {isSupported 
              ? 'Clique no botão e fale sua pergunta'
              : 'Seu navegador não suporta entrada de voz'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
