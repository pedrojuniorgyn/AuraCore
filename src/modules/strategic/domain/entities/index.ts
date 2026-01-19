/**
 * Entities do Módulo Strategic
 * 
 * @module strategic/domain/entities
 */
export { Strategy, type StrategyStatus } from './Strategy';
export { StrategicGoal } from './StrategicGoal';
export { ActionPlan, type ActionPlanStatus, type Priority } from './ActionPlan';
export { ActionPlanFollowUp, type ProblemSeverity } from './ActionPlanFollowUp';
export { IdeaBox, type IdeaSourceType, type ConversionTarget } from './IdeaBox';
export { KPI, type KPIPolarity, type KPIFrequency, type KPIStatus } from './KPI';
export { StandardProcedure, type StandardProcedureStatus } from './StandardProcedure';
