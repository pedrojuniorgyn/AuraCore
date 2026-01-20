'use client';

/**
 * useDebouncedValue Hook
 * 
 * Hook para debounce de valores (busca, filtros, etc.).
 * Evita execuções excessivas durante digitação.
 * 
 * @module hooks/useDebouncedValue
 * @since E9 - Performance Optimizations
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para debounce de valores
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (default: 300)
 * @returns Valor debounced
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear timer anterior
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Novo timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para callback debounced
 * 
 * @param callback - Função a ser debounced
 * @param delay - Delay em milissegundos (default: 300)
 * @returns Função debounced
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   fetchResults(term);
 * }, 500);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Atualizar ref quando callback mudar
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook para throttle de valores
 * Diferente de debounce, throttle executa imediatamente e limita a frequência
 * 
 * @param value - Valor a ser throttled
 * @param interval - Intervalo mínimo em milissegundos (default: 300)
 * @returns Valor throttled
 */
export function useThrottledValue<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Skip first render, value is already set via useState
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastUpdateRef.current = Date.now();
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= interval) {
      // Pode atualizar imediatamente
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      // Agendar atualização
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, interval - timeSinceLastUpdate);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}
