/**
 * Fleet Module - Dependency Injection
 * 
 * @since E9 Fase 2
 */

import { container } from 'tsyringe';

// Gateways
import { VehicleServiceAdapter } from '../adapters/VehicleServiceAdapter';
import type { IVehicleServiceGateway } from '../../domain/ports/output/IVehicleServiceGateway';

export const FLEET_TOKENS = {
  VehicleServiceGateway: Symbol.for('IVehicleServiceGateway'),
};

let isRegistered = false;

export function registerFleetModule(): void {
  if (isRegistered) return;

  // Gateways
  container.registerSingleton<IVehicleServiceGateway>(
    FLEET_TOKENS.VehicleServiceGateway,
    VehicleServiceAdapter
  );

  isRegistered = true;
  console.log('[Fleet Module] DI configured - 1 gateway');
}

export function initializeFleetModule(): void {
  registerFleetModule();
}
