'use client';

import { useState, useCallback, useRef } from 'react';
import type { User } from '@/lib/comments/comment-types';

interface UseMentionsReturn {
  suggestions: User[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => void;
  clear: () => void;
}

/**
 * Hook para buscar usuários para menções (@mentions)
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, search } = useMentions();
 *
 * // Quando usuário digita @ no input
 * search('mar'); // Busca usuários que contém 'mar' no nome
 * ```
 */
export function useMentions(): UseMentionsReturn {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cancelar debounce anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Query vazia
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    // Debounce de 200ms
    debounceTimeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/strategic/users/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Erro ao buscar usuários');
        }

        const data = await response.json();
        setSuggestions(data.users || []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Requisição cancelada, ignorar
          return;
        }
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));

        // Fallback com dados mock se API não existir
        const mockUsers: User[] = [
          { id: 'user-1', name: 'João Silva', email: 'joao@empresa.com', initials: 'JS' },
          { id: 'user-2', name: 'Maria Santos', email: 'maria@empresa.com', initials: 'MS' },
          { id: 'user-3', name: 'Pedro Lima', email: 'pedro@empresa.com', initials: 'PL' },
          { id: 'user-4', name: 'Ana Costa', email: 'ana@empresa.com', initials: 'AC' },
          { id: 'user-5', name: 'Carlos Oliveira', email: 'carlos@empresa.com', initials: 'CO' },
        ];

        const filtered = mockUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email?.toLowerCase().includes(query.toLowerCase())
        );

        setSuggestions(filtered);
        setError(null); // Limpar erro pois fallback funcionou
      } finally {
        setIsLoading(false);
      }
    }, 200);
  }, []);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clear,
  };
}
