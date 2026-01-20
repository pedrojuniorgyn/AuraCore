/**
 * Queries do Módulo Strategic
 * 
 * @module strategic/application/queries
 */
export { GenerateAgendaUseCase, type GenerateAgendaInput, type IGenerateAgendaUseCase } from './GenerateAgendaUseCase';
export { GetStrategyQuery, type GetStrategyInput, type StrategyDTO, type GoalDTO, type KpiDTO, type IGetStrategyUseCase } from './GetStrategyQuery';
export { ListGoalsQuery, type ListGoalsInput, type GoalListItemDTO, type ListGoalsOutput, type IListGoalsUseCase } from './ListGoalsQuery';
export { GetKpiHistoryQuery, type GetKpiHistoryInput, type KpiHistoryPointDTO, type KpiHistoryOutput, type IGetKpiHistoryUseCase } from './GetKpiHistoryQuery';
export { GetWarRoomDashboardQuery, type GetWarRoomDashboardInput, type WarRoomDashboardOutput, type IGetWarRoomDashboardUseCase } from './GetWarRoomDashboardQuery';
