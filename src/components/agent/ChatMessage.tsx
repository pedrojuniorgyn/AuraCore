'use client';

/**
 * ChatMessage Component
 *
 * Displays a single chat message with avatar, content, and metadata.
 *
 * @see E-Agent-Fase6
 */

import React from 'react';
import { User, Bot, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/agents';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-blue-500' : 'bg-gray-700'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3',
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Tools used */}
        {message.metadata?.toolsUsed && message.metadata.toolsUsed.length > 0 && (
          <div
            className={cn(
              'mt-2 pt-2 border-t',
              isUser ? 'border-blue-400/50' : 'border-gray-200'
            )}
          >
            <div className="flex items-center gap-1 text-xs opacity-70">
              <Wrench className="w-3 h-3" />
              <span>Ferramentas: {message.metadata.toolsUsed.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
