/**
 * Strategic Components
 * Componentes para o módulo de Gestão Estratégica
 * 
 * @module components/strategic
 */

// Wave 10.6a - Dashboard + Mapa
export { BscPerspectiveCard } from './BscPerspectiveCard';
export { KpiGauge } from './KpiGauge';
export { HealthScoreRing } from './HealthScoreRing';
export { StrategicMap } from './StrategicMap';
export { GoalNode } from './GoalNode';

// Wave 10.6a - Dashboard Premium Components
export { CriticalAlerts, type Alert } from './CriticalAlerts';
export { QuickActions } from './QuickActions';
export { TrendChart } from './TrendChart';

// Wave 10.6c - Aurora AI Chatbot
export { AuraChat } from './AuraChat';
export { AuraChatButton } from './AuraChatButton';

// Wave 10.6b - PDCA + Action Plans Kanban
export { PdcaCard, type PdcaCardProps, type Priority, type PdcaPhase } from './PdcaCard';
export { PdcaKanban, type PdcaKanbanProps, type KanbanColumn, type KanbanCard } from './PdcaKanban';
export { ActionPlanCard, type ActionPlanCardProps, type ActionPlanStatus } from './ActionPlanCard';
export { ActionPlanKanban, type ActionPlanKanbanProps, type StatusColumn, type ActionPlanItem } from './ActionPlanKanban';
