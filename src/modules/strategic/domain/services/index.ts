/**
 * Domain Services do Módulo Strategic
 * 
 * @module strategic/domain/services
 */
export { GoalCascadeService, type CascadeTreeNode } from './GoalCascadeService';
export { KPICalculatorService, type KPIStatusValue, type Trend } from './KPICalculatorService';
export { KPIStatusCalculator, type KPIStatus, type KPIStatusThresholds } from './KPIStatusCalculator';
export {
  AgendaGeneratorService,
  type MeetingType,
  type AgendaItem,
  type AgendaSource,
  type RecurringItem,
  type GeneratedAgenda,
} from './AgendaGeneratorService';
export { ApprovalWorkflowService, type WorkflowTransitionResult } from './ApprovalWorkflowService';
