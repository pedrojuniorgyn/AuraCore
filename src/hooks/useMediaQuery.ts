import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries (responsividade)
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(max-width: 1024px)');
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  // Inicializar estado com valor correto (SSR-safe)
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // Verificar se estamos no cliente (window existe)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);

    // Listener para mudanças
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Adicionar listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
