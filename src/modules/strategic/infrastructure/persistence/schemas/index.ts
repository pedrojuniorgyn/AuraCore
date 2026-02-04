/**
 * Schemas do Módulo Strategic
 * Exporta todos os schemas de persistência
 * 
 * @module strategic/infrastructure/persistence/schemas
 */

// Core Schemas
export * from './strategy.schema';
export * from './bsc-perspective.schema';
export * from './strategic-goal.schema';
export * from './goal-cascade.schema';

// OKR Schemas
export * from '@/modules/strategic/okr/infrastructure/persistence/schemas';

// KPI Schemas
export * from './kpi.schema';
export * from './kpi-history.schema';

// Action Plan Schemas
export * from './action-plan.schema';
export * from './action-plan-follow-up.schema';
export * from './pdca-cycle.schema';

// GEROT Schemas (IC/IV)
export * from './control-item.schema';
export * from './verification-item.schema';

// GEROT Schemas (Anomaly)
export * from './anomaly.schema';

// Alert System
export * from './alert-log.schema';

// Approval System (Workflow)
export * from './approval-history.schema';
export * from './approval-delegate.schema';
export * from './approval-approver.schema';

// Supporting Schemas
export * from './swot-analysis.schema';
export * from './war-room-meeting.schema';
export * from './idea-box.schema';
export * from './standard-procedure.schema';
export * from './user-dashboard-layout.schema';
