// TMS Module - Public API

// Entities
export { Trip, type CreateTripProps } from './domain/entities/Trip';
export { Driver, type CreateDriverProps } from './domain/entities/Driver';
export { Vehicle, type CreateVehicleProps } from './domain/entities/Vehicle';

// Value Objects
export { TripStatus, type TripStatusType } from './domain/value-objects/TripStatus';
export { DriverStatus, type DriverStatusType } from './domain/value-objects/DriverStatus';
export { VehicleStatus, type VehicleStatusType } from './domain/value-objects/VehicleStatus';
export { DriverType, type DriverTypeValue } from './domain/value-objects/DriverType';

// Ports - Input
export type { ICreateTripUseCase, CreateTripInput, CreateTripOutput } from './domain/ports/input/ICreateTripUseCase';
export type { IGetTripByIdUseCase, GetTripByIdInput, TripOutput } from './domain/ports/input/IGetTripByIdUseCase';
export type { IListTripsUseCase, ListTripsInput, ListTripsOutput } from './domain/ports/input/IListTripsUseCase';
export type { ICompleteTripUseCase, CompleteTripInput, CompleteTripOutput } from './domain/ports/input/ICompleteTripUseCase';
export type { ICancelTripUseCase, CancelTripInput, CancelTripOutput } from './domain/ports/input/ICancelTripUseCase';

// Ports - Output
export type { ITripRepository, TripFilter, TripListResult } from './domain/ports/output/ITripRepository';
export type { IDriverRepository, DriverFilter, DriverListResult } from './domain/ports/output/IDriverRepository';
export type { IVehicleRepository, VehicleFilter, VehicleListResult } from './domain/ports/output/IVehicleRepository';

// Commands
export { CreateTripCommand } from './application/commands/CreateTripCommand';
export { CompleteTripCommand } from './application/commands/CompleteTripCommand';
export { CancelTripCommand } from './application/commands/CancelTripCommand';

// Queries
export { GetTripByIdQuery } from './application/queries/GetTripByIdQuery';
export { ListTripsQuery } from './application/queries/ListTripsQuery';

// DTOs
export { createTripSchema, type CreateTripInputDto } from './application/dtos/CreateTripInput';
export { listTripsSchema, type ListTripsInputDto } from './application/dtos/ListTripsInput';
export { completeTripSchema, type CompleteTripInputDto } from './application/dtos/CompleteTripInput';
export { cancelTripSchema, type CancelTripInputDto } from './application/dtos/CancelTripInput';

// DI
export { registerTmsModule, initializeTmsModule } from './infrastructure/di/TmsModule';
