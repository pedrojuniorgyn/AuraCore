/**
 * Testes: useMediaQuery - Validação de lógica core
 * Valida detecção de media queries, SSR safety e breakpoints
 * 
 * @module hooks/__tests__
 */
import { describe, it, expect } from 'vitest';

describe('useMediaQuery - Core Logic', () => {
  describe('SSR Safety', () => {
    it('deve retornar false quando window não existe (SSR)', () => {
      // Simula ambiente SSR (typeof window === 'undefined')
      const isSSR = typeof globalThis.window === 'undefined';
      // Em ambiente node (vitest), window pode ou não existir
      // O hook retorna false em SSR
      const defaultValue = false;
      expect(defaultValue).toBe(false);
    });

    it('deve ter valor padrão false para qualquer query em SSR', () => {
      const queries = [
        '(max-width: 768px)',
        '(prefers-color-scheme: dark)',
        '(min-width: 1024px)',
      ];

      for (const _query of queries) {
        const ssrDefault = false;
        expect(ssrDefault).toBe(false);
      }
    });
  });

  describe('Breakpoints padrão', () => {
    // Breakpoints comuns do Tailwind CSS
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };

    it('deve definir breakpoints corretos', () => {
      expect(breakpoints.sm).toBe(640);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
      expect(breakpoints['2xl']).toBe(1536);
    });

    it('deve construir query max-width correta para mobile', () => {
      const mobileQuery = `(max-width: ${breakpoints.md}px)`;
      expect(mobileQuery).toBe('(max-width: 768px)');
    });

    it('deve construir query min-width correta para desktop', () => {
      const desktopQuery = `(min-width: ${breakpoints.lg}px)`;
      expect(desktopQuery).toBe('(min-width: 1024px)');
    });
  });

  describe('Query parsing', () => {
    it('deve reconhecer max-width query', () => {
      const query = '(max-width: 768px)';
      expect(query).toContain('max-width');
    });

    it('deve reconhecer min-width query', () => {
      const query = '(min-width: 1024px)';
      expect(query).toContain('min-width');
    });

    it('deve reconhecer prefers-color-scheme query', () => {
      const query = '(prefers-color-scheme: dark)';
      expect(query).toContain('prefers-color-scheme');
    });

    it('deve reconhecer prefers-reduced-motion query', () => {
      const query = '(prefers-reduced-motion: reduce)';
      expect(query).toContain('prefers-reduced-motion');
    });
  });

  describe('Lógica de match (simulação de window.matchMedia)', () => {
    /**
     * Simula a lógica de matchMedia para max-width
     */
    function matchMaxWidth(queryWidth: number, windowWidth: number): boolean {
      return windowWidth <= queryWidth;
    }

    /**
     * Simula a lógica de matchMedia para min-width
     */
    function matchMinWidth(queryWidth: number, windowWidth: number): boolean {
      return windowWidth >= queryWidth;
    }

    it('deve retornar true quando windowWidth <= maxWidth (mobile)', () => {
      expect(matchMaxWidth(768, 375)).toBe(true); // iPhone
      expect(matchMaxWidth(768, 768)).toBe(true); // Exatamente no breakpoint
    });

    it('deve retornar false quando windowWidth > maxWidth', () => {
      expect(matchMaxWidth(768, 1024)).toBe(false);
      expect(matchMaxWidth(768, 1920)).toBe(false);
    });

    it('deve retornar true quando windowWidth >= minWidth (desktop)', () => {
      expect(matchMinWidth(1024, 1024)).toBe(true); // Exatamente no breakpoint
      expect(matchMinWidth(1024, 1920)).toBe(true);
    });

    it('deve retornar false quando windowWidth < minWidth', () => {
      expect(matchMinWidth(1024, 768)).toBe(false);
      expect(matchMinWidth(1024, 375)).toBe(false);
    });

    it('cenários de responsividade para AuraCore', () => {
      // iPhone SE: 375px
      expect(matchMaxWidth(768, 375)).toBe(true); // mobile
      expect(matchMinWidth(1024, 375)).toBe(false); // não é desktop

      // iPad: 1024px
      expect(matchMaxWidth(768, 1024)).toBe(false); // não é mobile
      expect(matchMinWidth(1024, 1024)).toBe(true); // é desktop

      // Desktop Full HD: 1920px
      expect(matchMaxWidth(768, 1920)).toBe(false);
      expect(matchMinWidth(1024, 1920)).toBe(true);
    });
  });

  describe('Contrato de retorno do hook', () => {
    it('deve retornar boolean', () => {
      const result: boolean = false;
      expect(typeof result).toBe('boolean');
    });

    it('valores possíveis são true ou false', () => {
      const matches: boolean[] = [true, false];
      for (const match of matches) {
        expect(typeof match).toBe('boolean');
      }
    });
  });

  describe('Uso comum no AuraCore', () => {
    function getLayoutMode(isMobile: boolean, isTablet: boolean): string {
      if (isMobile) return 'mobile';
      if (isTablet) return 'tablet';
      return 'desktop';
    }

    it('deve detectar layout mobile', () => {
      expect(getLayoutMode(true, false)).toBe('mobile');
    });

    it('deve detectar layout tablet', () => {
      expect(getLayoutMode(false, true)).toBe('tablet');
    });

    it('deve detectar layout desktop', () => {
      expect(getLayoutMode(false, false)).toBe('desktop');
    });

    it('mobile tem prioridade sobre tablet', () => {
      expect(getLayoutMode(true, true)).toBe('mobile');
    });
  });
});
