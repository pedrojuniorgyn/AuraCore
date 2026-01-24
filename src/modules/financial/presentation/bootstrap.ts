/**
 * Financial Module Bootstrap
 * 
 * Wrapper para inicialização do módulo Financial.
 * Re-exporta de infrastructure/di para facilitar import.
 */
import 'reflect-metadata';

// Re-export from FinancialModule
export { initializeFinancialModule } from '../infrastructure/di/FinancialModule';

let isInitialized = false;

/**
 * Verifica se o módulo está inicializado
 */
export function isFinancialModuleInitialized(): boolean {
  return isInitialized;
}

/**
 * Marca o módulo como inicializado
 * (Chamado internamente após initializeFinancialModule)
 */
export function markFinancialModuleInitialized(): void {
  isInitialized = true;
}
