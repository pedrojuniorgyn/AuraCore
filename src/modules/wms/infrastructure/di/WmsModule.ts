import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Repositories
import { DrizzleLocationRepository } from '../persistence/repositories/DrizzleLocationRepository';
import { DrizzleStockRepository } from '../persistence/repositories/DrizzleStockRepository';
import { DrizzleMovementRepository } from '../persistence/repositories/DrizzleMovementRepository';
import { DrizzleInventoryCountRepository } from '../persistence/repositories/DrizzleInventoryCountRepository';

// Command Use Cases (existentes - Semana 2)
import { RegisterStockEntry } from '../../application/use-cases/RegisterStockEntry';
import { RegisterStockExit } from '../../application/use-cases/RegisterStockExit';
import { TransferStock } from '../../application/use-cases/TransferStock';
import { CreateLocation } from '../../application/use-cases/CreateLocation';
import { StartInventoryCount } from '../../application/use-cases/StartInventoryCount';
import { CompleteInventoryCount } from '../../application/use-cases/CompleteInventoryCount';

// Command Use Cases (novos - Semana 3)
import { UpdateLocation } from '../../application/use-cases/UpdateLocation';
import { DeleteLocation } from '../../application/use-cases/DeleteLocation';

// Query Use Cases (Semana 3)
import { GetLocationById } from '../../application/use-cases/queries/GetLocationById';
import { ListLocations } from '../../application/use-cases/queries/ListLocations';
import { GetStockItemById } from '../../application/use-cases/queries/GetStockItemById';
import { ListStockItems } from '../../application/use-cases/queries/ListStockItems';
import { GetStockByProduct } from '../../application/use-cases/queries/GetStockByProduct';
import { GetInventoryCountById } from '../../application/use-cases/queries/GetInventoryCountById';
import { ListInventoryCounts } from '../../application/use-cases/queries/ListInventoryCounts';
import { GetMovementById } from '../../application/use-cases/queries/GetMovementById';
import { ListMovements } from '../../application/use-cases/queries/ListMovements';

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

  isRegistered = true;
  console.log('[WMS Module] Dependency injection configured - 4 repos + 8 commands + 9 queries');
}

export function initializeWmsModule(): void {
  registerWmsModule();
}

