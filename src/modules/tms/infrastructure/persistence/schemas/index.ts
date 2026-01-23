<<<<<<< HEAD
// TMS Schemas
export { tripsTable, type TripRow, type TripInsert } from './trip.schema';
export { driversTable, type DriverRow, type DriverInsert } from './driver.schema';
export { vehiclesTable, type VehicleRow, type VehicleInsert } from './vehicle.schema';

// Re-export existing schemas
export { romaneios } from '../RomaneioSchema';
export { romaneioItems } from '../RomaneioItemSchema';
=======
/**
 * TMS Persistence Schemas - Export Index
 * E14 - Schemas consolidation
 */

export * from './trip.schema';
export * from './driver.schema';
export * from './vehicle.schema';
export * from '../RomaneioSchema';
export * from '../RomaneioItemSchema';
>>>>>>> ed5fcc0e (E14: Add TMS/WMS schema index.ts exports)
