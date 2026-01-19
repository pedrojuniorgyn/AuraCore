'use client';

/**
 * useAgentChat Hook
 *
 * React hook for managing agent chat state and interactions.
 * Handles sending messages, loading sessions, and voice messages.
 *
 * @module hooks
 * @see E-Agent-Fase6
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage } from '@/agent/persistence';

interface UseAgentChatOptions {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  clearError: () => void;
}

export function useAgentChat({
  sessionId,
  onSessionCreated,
}: UseAgentChatOptions = {}): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    sessionId ?? null
  );

  // Memoizar loadSession com useCallback para evitar stale closures
  const loadSession = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agent/sessions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setCurrentSessionId(id);
      } else {
        setError('Failed to load session');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []); // Deps vazias pois só usa setters que são estáveis

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]); // loadSession incluída nas dependências

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: currentSessionId ?? '',
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: currentSessionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Update session ID if new session was created
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
          onSessionCreated?.(data.sessionId);
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sessionId: data.sessionId ?? currentSessionId ?? '',
          role: 'assistant',
          content: data.response,
          toolsUsed: data.toolsUsed,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Remove optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, onSessionCreated]
  );

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      setIsLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        if (currentSessionId) {
          formData.append('sessionId', currentSessionId);
        }

        const response = await fetch('/api/agent/voice/conversation', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process voice message');
        }

        const data = await response.json();

        // Add both messages
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sessionId: data.sessionId ?? currentSessionId ?? '',
          role: 'user',
          content: data.userTranscript,
          createdAt: new Date(),
        };

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sessionId: data.sessionId ?? currentSessionId ?? '',
          role: 'assistant',
          content: data.agentResponse,
          toolsUsed: data.toolsUsed,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);

        // Update session ID if new
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
          onSessionCreated?.(data.sessionId);
        }

        // Play audio response if available
        if (data.audioResponseBase64) {
          const audio = new Audio(
            `data:audio/mpeg;base64,${data.audioResponseBase64}`
          );
          audio.play().catch(console.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, onSessionCreated]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentSessionId,
    sendMessage,
    sendVoiceMessage,
    clearError,
  };
}
