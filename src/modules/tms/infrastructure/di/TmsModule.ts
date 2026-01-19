/**
 * TmsModule - Módulo de Injeção de Dependências do TMS
 */
import { container } from 'tsyringe';

// Repositories
import { DrizzleTripRepository } from '../persistence/repositories/DrizzleTripRepository';
import { DrizzleDriverRepository } from '../persistence/repositories/DrizzleDriverRepository';
import { DrizzleVehicleRepository } from '../persistence/repositories/DrizzleVehicleRepository';

// Commands
import { CreateTripCommand } from '../../application/commands/CreateTripCommand';
import { CompleteTripCommand } from '../../application/commands/CompleteTripCommand';
import { CancelTripCommand } from '../../application/commands/CancelTripCommand';

// Queries
import { GetTripByIdQuery } from '../../application/queries/GetTripByIdQuery';
import { ListTripsQuery } from '../../application/queries/ListTripsQuery';

let isRegistered = false;

export function registerTmsModule(): void {
  if (isRegistered) return;

  // Repositories
  container.registerSingleton('ITripRepository', DrizzleTripRepository);
  container.registerSingleton('IDriverRepository', DrizzleDriverRepository);
  container.registerSingleton('IVehicleRepository', DrizzleVehicleRepository);

  // Commands
  container.registerSingleton(CreateTripCommand);
  container.registerSingleton(CompleteTripCommand);
  container.registerSingleton(CancelTripCommand);

  // Queries
  container.registerSingleton(GetTripByIdQuery);
  container.registerSingleton(ListTripsQuery);

  isRegistered = true;
  console.log('[TMS Module] DI configured - 3 repos + 3 commands + 2 queries');
}

export function initializeTmsModule(): void {
  registerTmsModule();
}
