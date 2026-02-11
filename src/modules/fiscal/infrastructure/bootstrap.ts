import 'reflect-metadata';
import { registerFiscalModule } from './di/FiscalModule';

import { logger } from '@/shared/infrastructure/logging';
let isInitialized = false;

/**
 * Inicializa o módulo Fiscal
 * 
 * Deve ser chamado antes de usar qualquer componente do módulo (Use Cases, Repository).
 * É idempotente - pode ser chamado múltiplas vezes com segurança.
 * 
 * **BUG 3 FIX**: Esta função DEVE ser chamada no bootstrap da aplicação
 * (ex: middleware.ts, layout.tsx, ou antes de usar qualquer Use Case).
 */
export function initializeFiscalModule(): void {
  if (isInitialized) {
    return;
  }

  registerFiscalModule();
  isInitialized = true;
  
  logger.info('[Fiscal] Module initialized');
}

/**
 * Verifica se o módulo está inicializado
 */
export function isFiscalModuleInitialized(): boolean {
  return isInitialized;
}

