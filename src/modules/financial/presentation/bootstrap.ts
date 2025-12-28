import 'reflect-metadata';
import { registerFinancialModule } from '../infrastructure/di/FinancialModule';

let isInitialized = false;

/**
 * Inicializa o módulo Financial
 * 
 * Deve ser chamado antes de usar qualquer componente do módulo.
 * É idempotente - pode ser chamado múltiplas vezes com segurança.
 */
export function initializeFinancialModule(): void {
  if (isInitialized) {
    return;
  }

  registerFinancialModule();
  isInitialized = true;
  
  console.log('[Financial] Module initialized');
}

/**
 * Verifica se o módulo está inicializado
 */
export function isFinancialModuleInitialized(): boolean {
  return isInitialized;
}

