/**
 * DI Tokens do Módulo Strategic
 * 
 * @module strategic/infrastructure/di
 */
export const STRATEGIC_TOKENS = {
  // Repositories
  StrategyRepository: Symbol.for('IStrategyRepository'),
  StrategicGoalRepository: Symbol.for('IStrategicGoalRepository'),
  ActionPlanRepository: Symbol.for('IActionPlanRepository'),
  IdeaBoxRepository: Symbol.for('IIdeaBoxRepository'),
  KPIRepository: Symbol.for('IKPIRepository'),
  ActionPlanFollowUpRepository: Symbol.for('IActionPlanFollowUpRepository'),
  WarRoomMeetingRepository: Symbol.for('IWarRoomMeetingRepository'),
  SwotAnalysisRepository: Symbol.for('ISwotAnalysisRepository'),
  
  // Use Cases - Commands
  CreateStrategyUseCase: Symbol.for('ICreateStrategyUseCase'),
  ActivateStrategyUseCase: Symbol.for('IActivateStrategyUseCase'),
  CreateGoalUseCase: Symbol.for('ICreateGoalUseCase'),
  CascadeGoalUseCase: Symbol.for('ICascadeGoalUseCase'),
  UpdateGoalProgressUseCase: Symbol.for('IUpdateGoalProgressUseCase'),
  CreateKPIUseCase: Symbol.for('ICreateKPIUseCase'),
  UpdateKPIValueUseCase: Symbol.for('IUpdateKPIValueUseCase'),
  SyncKPIValuesUseCase: Symbol.for('ISyncKPIValuesUseCase'),
  CreateActionPlanUseCase: Symbol.for('ICreateActionPlanUseCase'),
  AdvancePDCAUseCase: Symbol.for('IAdvancePDCAUseCase'),
  ExecuteFollowUpUseCase: Symbol.for('IExecuteFollowUpUseCase'),
  ReproposeActionPlanUseCase: Symbol.for('IReproposeActionPlanUseCase'),
  SubmitIdeaUseCase: Symbol.for('ISubmitIdeaUseCase'),
  ReviewIdeaUseCase: Symbol.for('IReviewIdeaUseCase'),
  ConvertIdeaUseCase: Symbol.for('IConvertIdeaUseCase'),
  ScheduleMeetingUseCase: Symbol.for('IScheduleMeetingUseCase'),
  RecordDecisionUseCase: Symbol.for('IRecordDecisionUseCase'),
  CreateSwotItemUseCase: Symbol.for('ICreateSwotItemUseCase'),
  
  // Use Cases - Queries
  GetStrategyUseCase: Symbol.for('IGetStrategyUseCase'),
  ListGoalsUseCase: Symbol.for('IListGoalsUseCase'),
  GetBSCDashboardUseCase: Symbol.for('IGetBSCDashboardUseCase'),
  GetStrategicMapUseCase: Symbol.for('IGetStrategicMapUseCase'),
  ListActionPlansUseCase: Symbol.for('IListActionPlansUseCase'),
  GetActionPlanTimelineUseCase: Symbol.for('IGetActionPlanTimelineUseCase'),
  ListIdeasUseCase: Symbol.for('IListIdeasUseCase'),
  GetWarRoomDashboardUseCase: Symbol.for('IGetWarRoomDashboardUseCase'),
  GenerateAgendaUseCase: Symbol.for('IGenerateAgendaUseCase'),
  GetKpiHistoryUseCase: Symbol.for('IGetKpiHistoryUseCase'),
  
  // Domain Services
  GoalCascadeService: Symbol.for('IGoalCascadeService'),
  KPICalculatorService: Symbol.for('IKPICalculatorService'),
  AgendaGeneratorService: Symbol.for('IAgendaGeneratorService'),
  
  // Integrations
  FinancialKPIAdapter: Symbol.for('IFinancialKPIAdapter'),
  TMSKPIAdapter: Symbol.for('ITMSKPIAdapter'),
  WMSKPIAdapter: Symbol.for('IWMSKPIAdapter'),
} as const;
