// TMS Schemas
export { tripsTable, type TripRow, type TripInsert } from './trip.schema';
export { driversTable, type DriverRow, type DriverInsert } from './driver.schema';
export { vehiclesTable, type VehicleRow, type VehicleInsert } from './vehicle.schema';

// Re-export existing schemas
export { romaneios } from '../RomaneioSchema';
export { romaneioItems } from '../RomaneioItemSchema';
