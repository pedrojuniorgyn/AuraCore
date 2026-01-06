import 'reflect-metadata';
// Note: Financial module now uses factories instead of DI container registration
// import { registerFinancialModule } from '../infrastructure/di/FinancialModule';

let isInitialized = false;

/**
 * Inicializa o módulo Financial
 * 
 * Deve ser chamado antes de usar qualquer componente do módulo.
 * É idempotente - pode ser chamado múltiplas vezes com segurança.
 * 
 * Note: Financial module now uses factory pattern.
 * Use createGeneratePayableTitleUseCase(), createGenerateReceivableTitleUseCase(), etc.
 */
export function initializeFinancialModule(): void {
  if (isInitialized) {
    return;
  }

  // Financial module now uses factories - no container registration needed
  isInitialized = true;
  
  console.log('[Financial] Module initialized (using factories)');
}

/**
 * Verifica se o módulo está inicializado
 */
export function isFinancialModuleInitialized(): boolean {
  return isInitialized;
}

