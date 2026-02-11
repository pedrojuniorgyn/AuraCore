/**
 * TmsModule - Módulo de Injeção de Dependências do TMS
 */
import { container } from 'tsyringe';

// Repositories
import { DrizzleTripRepository } from '../persistence/repositories/DrizzleTripRepository';
import { DrizzleDriverRepository } from '../persistence/repositories/DrizzleDriverRepository';
import { DrizzleVehicleRepository } from '../persistence/repositories/DrizzleVehicleRepository';

// Gateways/Adapters (E9 Fase 1 + Fase 2)
import { FreightCalculatorAdapter } from '../adapters/FreightCalculatorAdapter';
import type { IFreightCalculatorGateway } from '../../domain/ports/output/IFreightCalculatorGateway';
import { WorkflowAutomatorAdapter } from '../adapters/WorkflowAutomatorAdapter';
import type { IWorkflowAutomatorGateway } from '../../domain/ports/output/IWorkflowAutomatorGateway';

// Commands
import { CreateTripCommand } from '../../application/commands/CreateTripCommand';
import { CompleteTripCommand } from '../../application/commands/CompleteTripCommand';
import { CancelTripCommand } from '../../application/commands/CancelTripCommand';

// Queries
import { GetTripByIdQuery } from '../../application/queries/GetTripByIdQuery';
import { ListTripsQuery } from '../../application/queries/ListTripsQuery';

import { logger } from '@/shared/infrastructure/logging';
// Tokens
export const TMS_TOKENS = {
  TripRepository: Symbol.for('ITripRepository'),
  DriverRepository: Symbol.for('IDriverRepository'),
  VehicleRepository: Symbol.for('IVehicleRepository'),
  FreightCalculatorGateway: Symbol.for('IFreightCalculatorGateway'),
  WorkflowAutomatorGateway: Symbol.for('IWorkflowAutomatorGateway'),
};

let isRegistered = false;

export function registerTmsModule(): void {
  if (isRegistered) return;

  // Repositories
  container.registerSingleton('ITripRepository', DrizzleTripRepository);
  container.registerSingleton('IDriverRepository', DrizzleDriverRepository);
  container.registerSingleton('IVehicleRepository', DrizzleVehicleRepository);

  // Gateways (E9 Fase 1 + Fase 2)
  container.registerSingleton<IFreightCalculatorGateway>(
    TMS_TOKENS.FreightCalculatorGateway,
    FreightCalculatorAdapter
  );
  container.registerSingleton<IWorkflowAutomatorGateway>(
    TMS_TOKENS.WorkflowAutomatorGateway,
    WorkflowAutomatorAdapter
  );

  // Commands
  container.registerSingleton(CreateTripCommand);
  container.registerSingleton(CompleteTripCommand);
  container.registerSingleton(CancelTripCommand);

  // Queries
  container.registerSingleton(GetTripByIdQuery);
  container.registerSingleton(ListTripsQuery);

  isRegistered = true;
  logger.info('[TMS Module] DI configured - 3 repos + 2 gateways + 3 commands + 2 queries');
}

export function initializeTmsModule(): void {
  registerTmsModule();
}
