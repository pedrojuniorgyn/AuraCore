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

// 5W2H + 3G + SWOT + War Room DTOs (Onda 10.3)
export * from './CreateActionPlan5W2HDTO';
export * from './UpdateActionPlanDTO';
export * from './CreateFollowUp3GDTO';
export * from './CreateSwotItemDTO';
export * from './WarRoomDTO';
export type { ReproposeActionPlanInput, ReproposeActionPlanOutput } from './ReproposeActionPlanDTO';
