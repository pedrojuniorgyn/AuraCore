import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Repositories
import { DrizzleLocationRepository } from '../persistence/repositories/DrizzleLocationRepository';
import { DrizzleStockRepository } from '../persistence/repositories/DrizzleStockRepository';
import { DrizzleMovementRepository } from '../persistence/repositories/DrizzleMovementRepository';
import { DrizzleInventoryCountRepository } from '../persistence/repositories/DrizzleInventoryCountRepository';

// Gateways (E9 Fase 2)
import { WmsBillingAdapter } from '../adapters/WmsBillingAdapter';
import type { IWmsBillingGateway } from '../../domain/ports/output/IWmsBillingGateway';

// Tokens locais (E9 Fase 2)
export const WMS_TOKENS = {
  BillingGateway: Symbol.for('IWmsBillingGateway'),
};

// Commands (ARCH-012)
import { RegisterStockEntry } from '../../application/commands/RegisterStockEntry';
import { RegisterStockExit } from '../../application/commands/RegisterStockExit';
import { TransferStock } from '../../application/commands/TransferStock';
import { CreateLocation } from '../../application/commands/CreateLocation';
import { UpdateLocation } from '../../application/commands/UpdateLocation';
import { DeleteLocation } from '../../application/commands/DeleteLocation';
import { StartInventoryCount } from '../../application/commands/StartInventoryCount';
import { CompleteInventoryCount } from '../../application/commands/CompleteInventoryCount';

// Queries (ARCH-013)
import { GetLocationById } from '../../application/queries/GetLocationById';
import { ListLocations } from '../../application/queries/ListLocations';
import { GetStockItemById } from '../../application/queries/GetStockItemById';
import { ListStockItems } from '../../application/queries/ListStockItems';
import { GetStockByProduct } from '../../application/queries/GetStockByProduct';
import { GetInventoryCountById } from '../../application/queries/GetInventoryCountById';
import { ListInventoryCounts } from '../../application/queries/ListInventoryCounts';
import { GetMovementById } from '../../application/queries/GetMovementById';
import { ListMovements } from '../../application/queries/ListMovements';

import { logger } from '@/shared/infrastructure/logging';
/**
 * WmsModule - Dependency Injection Configuration
 * E7.8 WMS Semana 2 + Semana 3
 * 
 * Registra:
 * - 4 Repositories
 * - 8 Command Use Cases (6 existentes + 2 novos)
 * - 9 Query Use Cases (novos)
 */

let isRegistered = false;

export function registerWmsModule(): void {
  if (isRegistered) {
    return;
  }

  // ============================================
  // REPOSITORIES (4)
  // ============================================
  container.registerSingleton(TOKENS.LocationRepository, DrizzleLocationRepository);
  container.registerSingleton(TOKENS.StockRepository, DrizzleStockRepository);
  container.registerSingleton(TOKENS.MovementRepository, DrizzleMovementRepository);
  container.registerSingleton(TOKENS.InventoryCountRepository, DrizzleInventoryCountRepository);

  // ============================================
  // COMMAND USE CASES - Existentes (6)
  // ============================================
  container.registerSingleton(RegisterStockEntry);
  container.registerSingleton(RegisterStockExit);
  container.registerSingleton(TransferStock);
  container.registerSingleton(CreateLocation);
  container.registerSingleton(StartInventoryCount);
  container.registerSingleton(CompleteInventoryCount);

  // ============================================
  // COMMAND USE CASES - Novos (2)
  // ============================================
  container.registerSingleton(UpdateLocation);
  container.registerSingleton(DeleteLocation);

  // ============================================
  // QUERY USE CASES - Locations (2)
  // ============================================
  container.registerSingleton(GetLocationById);
  container.registerSingleton(ListLocations);

  // ============================================
  // QUERY USE CASES - Stock (3)
  // ============================================
  container.registerSingleton(GetStockItemById);
  container.registerSingleton(ListStockItems);
  container.registerSingleton(GetStockByProduct);

  // ============================================
  // QUERY USE CASES - Inventory (2)
  // ============================================
  container.registerSingleton(GetInventoryCountById);
  container.registerSingleton(ListInventoryCounts);

  // ============================================
  // QUERY USE CASES - Movements (2)
  // ============================================
  container.registerSingleton(GetMovementById);
  container.registerSingleton(ListMovements);

  // ============================================
  // GATEWAYS (E9 Fase 2)
  // ============================================
  container.registerSingleton<IWmsBillingGateway>(
    WMS_TOKENS.BillingGateway,
    WmsBillingAdapter
  );

  isRegistered = true;
  logger.info('[WMS Module] DI configured - 4 repos + 8 commands + 9 queries + 1 gateway');
}

export function initializeWmsModule(): void {
  registerWmsModule();
}

