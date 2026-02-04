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

export class OkrModule {
  private static isRegistered = false;

  /**
   * Registra todas as dependências do módulo OKR
   */
  static register(): void {
    if (this.isRegistered) {
      console.log('[OkrModule] Already registered, skipping...');
      return;
    }

    // Repositories
    container.register<IOkrRepository>(
      OKR_TOKENS.OkrRepository,
      { useClass: DrizzleOkrRepository }
    );

    this.isRegistered = true;
    console.log('[OkrModule] Dependencies registered successfully');
  }
}
