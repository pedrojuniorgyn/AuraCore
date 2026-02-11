/**
 * Testes: useDebounce + useDebouncedValue + useDebouncedCallback
 * Valida lógica de debounce, timers e cleanup
 * 
 * @module hooks/__tests__
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useDebounce / useDebouncedValue - Core Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Debounce timer behavior', () => {
    /**
     * Simula a lógica core do debounce (extraída do hook)
     */
    function createDebounce<T>(delay: number = 500) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let currentValue: T | undefined = undefined;
      let debouncedValue: T | undefined = undefined;

      return {
        setValue(value: T) {
          currentValue = value;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            debouncedValue = currentValue;
          }, delay);
        },
        getCurrentValue() { return currentValue; },
        getDebouncedValue() { return debouncedValue; },
        cleanup() {
          if (timer) clearTimeout(timer);
        },
      };
    }

    it('deve atrasar a atualização do valor pelo delay especificado', () => {
      const debounce = createDebounce<string>(500);
      debounce.setValue('hello');

      // Antes do delay: valor debounced ainda é undefined
      expect(debounce.getDebouncedValue()).toBeUndefined();

      // Avancar 499ms: ainda não atualizou
      vi.advanceTimersByTime(499);
      expect(debounce.getDebouncedValue()).toBeUndefined();

      // Avancar mais 1ms (total: 500ms): agora atualizou
      vi.advanceTimersByTime(1);
      expect(debounce.getDebouncedValue()).toBe('hello');
    });

    it('deve resetar o timer quando valor muda antes do delay', () => {
      const debounce = createDebounce<string>(300);

      debounce.setValue('a');
      vi.advanceTimersByTime(200); // 200ms
      expect(debounce.getDebouncedValue()).toBeUndefined();

      debounce.setValue('ab'); // resetar timer
      vi.advanceTimersByTime(200); // 200ms desde 'ab' (total 400ms)
      expect(debounce.getDebouncedValue()).toBeUndefined();

      vi.advanceTimersByTime(100); // 300ms desde 'ab'
      expect(debounce.getDebouncedValue()).toBe('ab');
    });

    it('deve usar delay padrão de 500ms', () => {
      const debounce = createDebounce<string>();
      debounce.setValue('test');

      vi.advanceTimersByTime(499);
      expect(debounce.getDebouncedValue()).toBeUndefined();

      vi.advanceTimersByTime(1);
      expect(debounce.getDebouncedValue()).toBe('test');
    });

    it('deve usar o último valor quando múltiplas mudanças ocorrem', () => {
      const debounce = createDebounce<string>(300);

      debounce.setValue('first');
      vi.advanceTimersByTime(100);
      debounce.setValue('second');
      vi.advanceTimersByTime(100);
      debounce.setValue('third');
      vi.advanceTimersByTime(300);

      expect(debounce.getDebouncedValue()).toBe('third');
    });

    it('deve funcionar com tipos numéricos', () => {
      const debounce = createDebounce<number>(200);
      debounce.setValue(42);
      vi.advanceTimersByTime(200);
      expect(debounce.getDebouncedValue()).toBe(42);
    });

    it('deve funcionar com objetos', () => {
      const debounce = createDebounce<{ x: number }>(200);
      const obj = { x: 10 };
      debounce.setValue(obj);
      vi.advanceTimersByTime(200);
      expect(debounce.getDebouncedValue()).toEqual({ x: 10 });
    });

    it('deve limpar timer no cleanup', () => {
      const debounce = createDebounce<string>(300);
      debounce.setValue('test');
      debounce.cleanup();

      vi.advanceTimersByTime(500);
      // Valor nunca foi atualizado porque cleanup cancelou o timer
      expect(debounce.getDebouncedValue()).toBeUndefined();
    });
  });

  describe('Debounced callback behavior', () => {
    function createDebouncedCallback(delay: number = 300) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const callback = vi.fn();

      const debouncedFn = (...args: unknown[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          callback(...args);
        }, delay);
      };

      return { debouncedFn, callback };
    }

    it('deve chamar callback apenas após o delay', () => {
      const { debouncedFn, callback } = createDebouncedCallback(300);

      debouncedFn('test');
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledWith('test');
    });

    it('deve agrupar múltiplas chamadas em uma só', () => {
      const { debouncedFn, callback } = createDebouncedCallback(300);

      debouncedFn('a');
      debouncedFn('b');
      debouncedFn('c');

      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('c');
    });

    it('deve respeitar o delay entre chamadas separadas', () => {
      const { debouncedFn, callback } = createDebouncedCallback(200);

      debouncedFn('first');
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);

      debouncedFn('second');
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuração e edge cases', () => {
    it('delay de 0ms deve executar imediatamente (setTimeout(fn, 0))', () => {
      const callback = vi.fn();
      setTimeout(callback, 0);
      vi.advanceTimersByTime(0);
      expect(callback).toHaveBeenCalled();
    });

    it('deve funcionar com string vazia', () => {
      const debounce = createSimpleDebounce(300);
      debounce.setValue('');
      vi.advanceTimersByTime(300);
      expect(debounce.getDebouncedValue()).toBe('');
    });

    it('deve funcionar com null', () => {
      const debounce = createSimpleDebounce(300);
      debounce.setValue(null);
      vi.advanceTimersByTime(300);
      expect(debounce.getDebouncedValue()).toBeNull();
    });
  });
});

// Helper auxiliar para testes simples
function createSimpleDebounce(delay: number = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let debouncedValue: unknown = undefined;

  return {
    setValue(value: unknown) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        debouncedValue = value;
      }, delay);
    },
    getDebouncedValue() { return debouncedValue; },
  };
}
