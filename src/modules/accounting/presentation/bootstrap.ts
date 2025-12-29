import 'reflect-metadata';
import { registerAccountingModule } from '../infrastructure/di/AccountingModule';

let isInitialized = false;

/**
 * Inicializa o módulo Accounting
 * Idempotente - seguro chamar múltiplas vezes
 */
export function initializeAccountingModule(): void {
  if (isInitialized) {
    return;
  }

  registerAccountingModule();
  isInitialized = true;
  
  console.log('[Accounting] Module initialized');
}

/**
 * Verifica se o módulo está inicializado
 */
export function isAccountingModuleInitialized(): boolean {
  return isInitialized;
}

