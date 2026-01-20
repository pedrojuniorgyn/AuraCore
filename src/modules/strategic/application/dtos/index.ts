/**
 * Strategic Module DTOs
 * 
 * Schemas Zod para validação de entradas do módulo estratégico.
 * 
 * @module strategic/application/dtos
 */

// BSC DTOs (Onda 10.1)
export * from './CreateStrategicGoalDTO';
export * from './CreateKPIDTO';
export * from './RecordMeasurementDTO';

// PDCA DTOs (Onda 10.2)
export * from './CreatePdcaCycleDTO';
export * from './AdvancePdcaPhaseDTO';
export * from './AddPdcaActionDTO';
export * from './UpdatePdcaActionDTO';
