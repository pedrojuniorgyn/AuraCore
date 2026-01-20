/**
 * Hook para comunicação com agentes IA.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/types/agents";

interface UseAgentChatOptions {
  streaming?: boolean;
  onError?: (error: Error) => void;
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (message: string, agentHint?: string) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
}

export function useAgentChat(
  options: UseAgentChatOptions = {}
): UseAgentChatReturn {
  const { streaming = true, onError } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (message: string, agentHint?: string) => {
      if (!message.trim()) return;

      // Adicionar mensagem do usuário
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Criar placeholder para resposta
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        abortControllerRef.current = new AbortController();

        const endpoint = streaming
          ? "/api/agents/chat/stream"
          : "/api/agents/chat";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: conversationIdRef.current,
            agentHint,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Erro: ${response.statusText}`);
        }

        if (streaming && response.body) {
          // Processar stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "text" && parsed.content) {
                    fullContent += parsed.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: fullContent }
                          : m
                      )
                    );
                  }
                } catch {
                  // Chunk pode ser texto puro
                  fullContent += data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                }
              }
            }
          }
        } else {
          // Resposta não-streaming
          const data = await response.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: data.message.content }
                : m
            )
          );
          conversationIdRef.current = data.conversationId;
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Geração cancelada
          return;
        }
        const error = err as Error;
        setError(error);
        onError?.(error);

        // Remover mensagem vazia do assistente em caso de erro
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [streaming, onError]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
  };
}
