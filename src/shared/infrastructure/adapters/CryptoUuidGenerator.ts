import { injectable } from '@/shared/infrastructure/di/container';
import type { IUuidGenerator } from '../../domain/ports/IUuidGenerator';

/**
 * Adapter: Usa globalThis.crypto.randomUUID()
 */
@injectable()
export class CryptoUuidGenerator implements IUuidGenerator {
  generate(): string {
    return globalThis.crypto.randomUUID();
  }
}

