import 'reflect-metadata';
import { registerAccountingModule } from '../infrastructure/di/AccountingModule';

import { logger } from '@/shared/infrastructure/logging';
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
  
  logger.info('[Accounting] Module initialized');
}

/**
 * Verifica se o módulo está inicializado
 */
export function isAccountingModuleInitialized(): boolean {
  return isInitialized;
}

