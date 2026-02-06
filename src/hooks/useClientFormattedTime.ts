/**
 * Hook para formatar timestamps apenas no cliente, evitando hydration mismatch.
 * 
 * Problema: toLocaleTimeString() gera valores diferentes entre servidor e cliente
 * devido a timezones diferentes, causando React Error #418.
 * 
 * Solução: Usar useSyncExternalStore para retornar string vazia no servidor
 * e formatar apenas após hydration no cliente.
 * 
 * @example
 * const formattedTime = useClientFormattedTime(insight.timestamp);
 * {formattedTime && <p>{formattedTime}</p>}
 */

import { useSyncExternalStore } from 'react';

// Store simples que sempre retorna true no cliente
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hook que detecta se está no cliente após hydration
 */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Formata timestamp para exibição, retornando string vazia no servidor.
 * Evita hydration mismatch causado por toLocaleTimeString().
 * 
 * @param timestamp - Date, string ISO, ou número (ms)
 * @param locale - Locale para formatação (default: 'pt-BR')
 * @param options - Opções de formatação do Intl.DateTimeFormat
 * @returns String formatada no cliente, string vazia no servidor
 */
export function useClientFormattedTime(
  timestamp: Date | string | number,
  locale: string = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const isClient = useIsClient();
  
  if (!isClient) {
    return '';
  }
  
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString(locale, options);
  } catch {
    return '';
  }
}

/**
 * Formata data completa para exibição, retornando string vazia no servidor.
 * 
 * @param timestamp - Date, string ISO, ou número (ms)
 * @param locale - Locale para formatação (default: 'pt-BR')
 * @param options - Opções de formatação do Intl.DateTimeFormat
 * @returns String formatada no cliente, string vazia no servidor
 */
export function useClientFormattedDate(
  timestamp: Date | string | number,
  locale: string = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const isClient = useIsClient();
  
  if (!isClient) {
    return '';
  }
  
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString(locale, options);
  } catch {
    return '';
  }
}

/**
 * Formata data e hora para exibição, retornando string vazia no servidor.
 * 
 * @param timestamp - Date, string ISO, ou número (ms)
 * @param locale - Locale para formatação (default: 'pt-BR')
 * @param options - Opções de formatação do Intl.DateTimeFormat
 * @returns String formatada no cliente, string vazia no servidor
 */
export function useClientFormattedDateTime(
  timestamp: Date | string | number,
  locale: string = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const isClient = useIsClient();
  
  if (!isClient) {
    return '';
  }
  
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString(locale, options);
  } catch {
    return '';
  }
}

export { useIsClient };
