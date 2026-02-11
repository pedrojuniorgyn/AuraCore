/**
 * DdaSyncService - Adapter DDD para sincronização DDA
 * 
 * E8 Fase 1.3: Encapsula o serviço legado BtgDdaService
 * permitindo injeção via DI container.
 * 
 * @deprecated O BtgDdaService legado será migrado para Use Cases DDD em fase futura.
 * Por enquanto, este adapter permite eliminar imports diretos de @/services/.
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { BtgDdaService } from '@/services/banking/btg-dda-service';

/**
 * Interface para o serviço de sincronização DDA
 */
export interface IDdaSyncService {
  syncDdaInbox(): Promise<number>;
  createPayableFromDda(ddaId: number): Promise<string>; // Retorna UUID do payable criado
  linkDdaToPayable(ddaId: number, payableId: string): Promise<void>; // payableId agora é UUID
}

/**
 * Factory para criar instância do serviço DDA
 * 
 * Nota: O BtgDdaService requer organizationId e bankAccountId no construtor,
 * então usamos uma factory ao invés de singleton.
 */
export function createDdaSyncService(
  organizationId: number,
  bankAccountId: number
): IDdaSyncService {
  return new BtgDdaService(organizationId, bankAccountId);
}

/**
 * Provider class para DI (quando precisar de singleton por request)
 */
@injectable()
export class DdaSyncServiceFactory {
  create(organizationId: number, bankAccountId: number): IDdaSyncService {
    return createDdaSyncService(organizationId, bankAccountId);
  }
}
