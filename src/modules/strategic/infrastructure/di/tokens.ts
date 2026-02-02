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
  ControlItemRepository: Symbol.for('IControlItemRepository'),
  VerificationItemRepository: Symbol.for('IVerificationItemRepository'),
  AnomalyRepository: Symbol.for('IAnomalyRepository'),
  StandardProcedureRepository: Symbol.for('IStandardProcedureRepository'),
  ActionPlanFollowUpRepository: Symbol.for('IActionPlanFollowUpRepository'),
  WarRoomMeetingRepository: Symbol.for('IWarRoomMeetingRepository'),
  SwotAnalysisRepository: Symbol.for('ISwotAnalysisRepository'),
  UserDashboardLayoutRepository: Symbol.for('IUserDashboardLayoutRepository'),
  AlertRepository: Symbol.for('IAlertRepository'),
  ApprovalHistoryRepository: Symbol.for('IApprovalHistoryRepository'),
  ApprovalPermissionRepository: Symbol.for('IApprovalPermissionRepository'),

  // Use Cases - Commands
  CreateStrategyUseCase: Symbol.for('ICreateStrategyUseCase'),
  CreateStrategyVersionUseCase: Symbol.for('ICreateStrategyVersionUseCase'),
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
  CreateControlItemUseCase: Symbol.for('ICreateControlItemUseCase'),
  UpdateControlItemValueUseCase: Symbol.for('IUpdateControlItemValueUseCase'),

  // Use Cases - Queries
  GetDashboardDataUseCase: Symbol.for('IGetDashboardDataUseCase'),
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
  GetDrilldownQuery: Symbol.for('IGetDrilldownQuery'),

  // Domain Services
  GoalCascadeService: Symbol.for('IGoalCascadeService'),
  KPICalculatorService: Symbol.for('IKPICalculatorService'),
  AgendaGeneratorService: Symbol.for('IAgendaGeneratorService'),
  AlertService: Symbol.for('AlertService'),
  BudgetImportService: Symbol.for('BudgetImportService'),
  ApprovalPermissionService: Symbol.for('ApprovalPermissionService'),
  
  // Integrations
  FinancialKPIAdapter: Symbol.for('IFinancialKPIAdapter'),
  TMSKPIAdapter: Symbol.for('ITMSKPIAdapter'),
  WMSKPIAdapter: Symbol.for('IWMSKPIAdapter'),
} as const;
