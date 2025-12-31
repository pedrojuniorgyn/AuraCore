import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleLocationRepository } from '../persistence/repositories/DrizzleLocationRepository';
import { DrizzleStockRepository } from '../persistence/repositories/DrizzleStockRepository';
import { DrizzleMovementRepository } from '../persistence/repositories/DrizzleMovementRepository';
import { DrizzleInventoryCountRepository } from '../persistence/repositories/DrizzleInventoryCountRepository';
import { RegisterStockEntry } from '../../application/use-cases/RegisterStockEntry';
import { RegisterStockExit } from '../../application/use-cases/RegisterStockExit';
import { TransferStock } from '../../application/use-cases/TransferStock';
import { CreateLocation } from '../../application/use-cases/CreateLocation';
import { StartInventoryCount } from '../../application/use-cases/StartInventoryCount';
import { CompleteInventoryCount } from '../../application/use-cases/CompleteInventoryCount';

/**
 * WmsModule - Dependency Injection Configuration
 * E7.8 WMS Semana 2
 */

let isRegistered = false;

export function registerWmsModule(): void {
  if (isRegistered) {
    return;
  }

  // Repositories
  container.registerSingleton(TOKENS.LocationRepository, DrizzleLocationRepository);
  container.registerSingleton(TOKENS.StockRepository, DrizzleStockRepository);
  container.registerSingleton(TOKENS.MovementRepository, DrizzleMovementRepository);
  container.registerSingleton(TOKENS.InventoryCountRepository, DrizzleInventoryCountRepository);

  // Use Cases
  container.registerSingleton(RegisterStockEntry);
  container.registerSingleton(RegisterStockExit);
  container.registerSingleton(TransferStock);
  container.registerSingleton(CreateLocation);
  container.registerSingleton(StartInventoryCount);
  container.registerSingleton(CompleteInventoryCount);

  isRegistered = true;
  console.log('[WMS Module] Dependency injection configured');
}

export function initializeWmsModule(): void {
  registerWmsModule();
}

