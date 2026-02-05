/**
 * OKR Module - Dependency Injection Configuration
 * Registra todas as dependências do módulo OKR
 * 
 * @module strategic/okr/infrastructure/di
 */
import { container } from 'tsyringe';
import type { IOkrRepository } from '../../domain/ports/output/IOkrRepository';
import { DrizzleOkrRepository } from '../persistence/repositories/DrizzleOkrRepository';
import { OKR_TOKENS } from './tokens';
import { logDebug } from '../../../../../lib/observability/logger';

export class OkrModule {
  private static isRegistered = false;

  /**
   * Registra todas as dependências do módulo OKR
   */
  static register(): void {
    if (this.isRegistered) {
      logDebug('OkrModule already registered, skipping...', { module: 'okr' });
      return;
    }

    // Repositories
    container.register<IOkrRepository>(
      OKR_TOKENS.OkrRepository,
      { useClass: DrizzleOkrRepository }
    );

    this.isRegistered = true;
    logDebug('OkrModule dependencies registered successfully', { module: 'okr' });
  }
}
