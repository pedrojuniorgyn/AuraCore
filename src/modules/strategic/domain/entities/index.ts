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
export { ControlItem, type ControlItemStatus, type MeasurementFrequency } from './ControlItem';
export { VerificationItem, type VerificationItemStatus, type VerificationFrequency } from './VerificationItem';
export { Anomaly, type AnomalyStatus, type AnomalySeverity, type AnomalySource } from './Anomaly';
export { SwotItem, type SwotQuadrant, type SwotStatus, type SwotCategory } from './SwotItem';
export { WarRoomMeeting, type MeetingType, type MeetingStatus } from './WarRoomMeeting';
