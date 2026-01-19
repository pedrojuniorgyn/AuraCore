import 'reflect-metadata';
import { injectable } from 'tsyringe';
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

