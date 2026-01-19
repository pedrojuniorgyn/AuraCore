'use client';

/**
 * SessionList Component
 *
 * Displays list of chat sessions with actions.
 *
 * @see E-Agent-Fase6
 */

import React from 'react';
import { MessageSquare, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/agent/persistence';

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}: SessionListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onNewSession} className="w-full">
          Nova conversa
        </Button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Nenhuma conversa ainda
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-100 transition-colors',
                activeSessionId === session.id && 'bg-gray-100'
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-sm">{session.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(session.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
