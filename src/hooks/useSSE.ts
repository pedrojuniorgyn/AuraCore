'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSSEOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  reconnectInterval?: number;
  maxRetries?: number;
  enabled?: boolean;
}

interface UseSSEReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Hook para conexão Server-Sent Events (SSE)
 *
 * @example
 * ```tsx
 * const { isConnected, error, reconnect } = useSSE({
 *   url: '/api/notifications/stream',
 *   onMessage: (event) => {
 *     const data = JSON.parse(event.data);
 *     console.log('Received:', data);
 *   },
 * });
 * ```
 */
export function useSSE({
  url,
  onMessage,
  onError,
  onOpen,
  reconnectInterval = 3000,
  maxRetries = 5,
  enabled = true,
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
  }, [onMessage, onError, onOpen]);

  // Disconnect function - defined first to avoid hoisting issues
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect effect
  useEffect(() => {
    if (!enabled) return;

    const connectSSE = () => {
      // Limpar conexão anterior
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          retriesRef.current = 0;
          onOpenRef.current?.();
        };

        eventSource.onmessage = (event) => {
          onMessageRef.current?.(event);
        };

        eventSource.onerror = (err) => {
          setIsConnected(false);
          setError(new Error('SSE connection error'));
          onErrorRef.current?.(err);

          // Tentar reconectar com backoff exponencial
          if (retriesRef.current < maxRetries) {
            retriesRef.current++;
            const delay = reconnectInterval * Math.pow(2, retriesRef.current - 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              connectSSE();
            }, delay);
          }
        };

        // Event listeners para tipos específicos de eventos SSE
        eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse((event as MessageEvent).data);
          onMessageRef.current?.(new MessageEvent('connected', { data: JSON.stringify(data) }));
        });

        eventSource.addEventListener('notification', (event) => {
          const data = JSON.parse((event as MessageEvent).data);
          onMessageRef.current?.(new MessageEvent('notification', { data: JSON.stringify(data) }));
        });

        eventSource.addEventListener('heartbeat', () => {
          // Mantém a conexão viva - não precisa processar
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect to SSE'));
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [url, reconnectInterval, maxRetries, enabled]);

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    disconnect();
    // Force reconnection by triggering effect via state
    setIsConnected(false);
  }, [disconnect]);

  return {
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}
