export type { ITripRepository, TripFilter, TripListResult } from './ITripRepository';
export type { IDriverRepository, DriverFilter, DriverListResult } from './IDriverRepository';
export type { IVehicleRepository, VehicleFilter, VehicleListResult } from './IVehicleRepository';
export type { 
  IFreightCalculatorGateway, 
  FreightCalculationParams, 
  FreightCalculationResult,
  FreightComponent 
} from './IFreightCalculatorGateway';

export type {
  IWorkflowAutomatorGateway,
  CreatePickupOrderParams,
  PickupOrderCreatedResult,
} from './IWorkflowAutomatorGateway';

// Romaneio repository
export type { IRomaneioRepository, FindRomaneiosFilters } from './IRomaneioRepository';
