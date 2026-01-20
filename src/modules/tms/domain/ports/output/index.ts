export type { ITripRepository, TripFilter, TripListResult } from './ITripRepository';
export type { IDriverRepository, DriverFilter, DriverListResult } from './IDriverRepository';
export type { IVehicleRepository, VehicleFilter, VehicleListResult } from './IVehicleRepository';
export type { 
  IFreightCalculatorGateway, 
  FreightCalculationParams, 
  FreightCalculationResult,
  FreightComponent 
} from './IFreightCalculatorGateway';

// Re-export existing
export type { IRomaneioRepository } from '../IRomaneioRepository';
