'use client';

/**
 * useIntersectionObserver Hook
 * 
 * Hook para detectar quando elementos entram no viewport.
 * Usado para lazy loading de componentes e infinite scroll.
 * 
 * @module hooks/useIntersectionObserver
 * @since E9 - Performance Optimizations
 */

import { useRef, useState, useEffect, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Elemento raiz para intersection (default: viewport) */
  root?: Element | null;
  /** Margem ao redor do root */
  rootMargin?: string;
  /** Threshold de visibilidade (0 a 1) */
  threshold?: number | number[];
  /** Se true, desconecta após primeira intersecção */
  triggerOnce?: boolean;
}

interface UseIntersectionObserverReturn {
  /** Ref callback para o elemento observado */
  ref: (node: Element | null) => void;
  /** Se o elemento está atualmente visível */
  isIntersecting: boolean;
  /** Se o elemento já foi visível alguma vez */
  hasIntersected: boolean;
  /** Entry completo do IntersectionObserver */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook para observar intersecção de elementos com o viewport
 * 
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   rootMargin: '100px',
 *   triggerOnce: true,
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <HeavyComponent />}
 *   </div>
 * );
 * ```
 */
export function useIntersectionObserver({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  triggerOnce = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    // Cleanup observer anterior
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node) {
      elementRef.current = null;
      return;
    }

    elementRef.current = node;

    // Verificar suporte
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback para SSR ou navegadores antigos
      setEntry(null);
      setHasIntersected(true);
      return;
    }

    // Criar novo observer
    observerRef.current = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);
        
        if (observedEntry.isIntersecting) {
          setHasIntersected(true);
          
          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current.observe(node);
  }, [root, rootMargin, threshold, triggerOnce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    ref,
    isIntersecting: entry?.isIntersecting ?? false,
    hasIntersected,
    entry,
  };
}
