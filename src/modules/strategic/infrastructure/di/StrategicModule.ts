import 'reflect-metadata';
import { container } from 'tsyringe';
import { STRATEGIC_TOKENS } from './tokens';

// Repositories
import { DrizzleStrategyRepository } from '../persistence/repositories/DrizzleStrategyRepository';
import { DrizzleStrategicGoalRepository } from '../persistence/repositories/DrizzleStrategicGoalRepository';
import { DrizzleActionPlanRepository } from '../persistence/repositories/DrizzleActionPlanRepository';
import { DrizzleKPIRepository } from '../persistence/repositories/DrizzleKPIRepository';
import { DrizzleControlItemRepository } from '../persistence/repositories/DrizzleControlItemRepository';
import { DrizzleVerificationItemRepository } from '../persistence/repositories/DrizzleVerificationItemRepository';
import { DrizzleAnomalyRepository } from '../persistence/repositories/DrizzleAnomalyRepository';
import { DrizzleStandardProcedureRepository } from '../persistence/repositories/DrizzleStandardProcedureRepository';
import { DrizzleIdeaBoxRepository } from '../persistence/repositories/DrizzleIdeaBoxRepository';
import { DrizzleActionPlanFollowUpRepository } from '../persistence/repositories/DrizzleActionPlanFollowUpRepository';
import { DrizzleSwotRepository } from '../persistence/repositories/DrizzleSwotRepository';
import { DrizzleWarRoomMeetingRepository } from '../persistence/repositories/DrizzleWarRoomMeetingRepository';
import { DrizzleUserDashboardLayoutRepository } from '../persistence/repositories/DrizzleUserDashboardLayoutRepository';

// Use Cases - Commands
import { CreateStrategyUseCase } from '../../application/commands/CreateStrategyUseCase';
import { CreateStrategyVersionUseCase } from '../../application/commands/CreateStrategyVersionUseCase';
import { ActivateStrategyUseCase } from '../../application/commands/ActivateStrategyUseCase';
import { CreateStrategicGoalUseCase } from '../../application/commands/CreateStrategicGoalUseCase';
import { CascadeGoalUseCase } from '../../application/commands/CascadeGoalUseCase';
import { UpdateGoalProgressUseCase } from '../../application/commands/UpdateGoalProgressUseCase';
import { CreateKPIUseCase } from '../../application/commands/CreateKPIUseCase';
import { UpdateKPIValueUseCase } from '../../application/commands/UpdateKPIValueUseCase';
import { SyncKPIValuesUseCase } from '../../application/commands/SyncKPIValuesUseCase';
import { CreateActionPlanUseCase } from '../../application/commands/CreateActionPlanUseCase';
import { AdvancePDCACycleUseCase } from '../../application/commands/AdvancePDCACycleUseCase';
import { ExecuteFollowUpUseCase } from '../../application/commands/ExecuteFollowUpUseCase';
import { CreateSwotItemCommand } from '../../application/commands/CreateSwotItemCommand';
import { ReproposeActionPlanUseCase } from '../../application/commands/ReproposeActionPlanUseCase';
import { SubmitIdeaUseCase } from '../../application/commands/SubmitIdeaUseCase';
import { ReviewIdeaUseCase } from '../../application/commands/ReviewIdeaUseCase';
import { ConvertIdeaUseCase } from '../../application/commands/ConvertIdeaUseCase';
import { ScheduleMeetingUseCase } from '../../application/commands/ScheduleMeetingUseCase';
import { RecordDecisionUseCase } from '../../application/commands/RecordDecisionUseCase';

// Use Cases - Queries
import { GenerateAgendaUseCase } from '../../application/queries/GenerateAgendaUseCase';
import { GetStrategyQuery } from '../../application/queries/GetStrategyQuery';
import { ListGoalsQuery } from '../../application/queries/ListGoalsQuery';
import { GetKpiHistoryQuery } from '../../application/queries/GetKpiHistoryQuery';
import { GetWarRoomDashboardQuery } from '../../application/queries/GetWarRoomDashboardQuery';
import { GetDashboardDataQuery } from '../../application/queries/GetDashboardDataQuery';
import { ListIdeasQuery } from '../../application/queries/ListIdeasQuery';
import { ListActionPlansQuery } from '../../application/queries/ListActionPlansQuery';
import { GetActionPlanTimelineQuery } from '../../application/queries/GetActionPlanTimelineQuery';
import { GetBSCDashboardQuery } from '../../application/queries/GetBSCDashboardQuery';
import { GetStrategicMapQuery } from '../../application/queries/GetStrategicMapQuery';

// Integrations
import { FinancialKPIDataSource } from '../integrations/FinancialKPIDataSource';
import { TMSKPIDataSource } from '../integrations/TMSKPIDataSource';

export function registerStrategicModule(): void {
  // Repositories - Fase F1 + F2
  container.registerSingleton(STRATEGIC_TOKENS.StrategyRepository, DrizzleStrategyRepository);
  container.registerSingleton(STRATEGIC_TOKENS.StrategicGoalRepository, DrizzleStrategicGoalRepository);
  container.registerSingleton(STRATEGIC_TOKENS.ActionPlanRepository, DrizzleActionPlanRepository);
  container.registerSingleton(STRATEGIC_TOKENS.KPIRepository, DrizzleKPIRepository);
  container.registerSingleton(STRATEGIC_TOKENS.ControlItemRepository, DrizzleControlItemRepository);
  container.registerSingleton(STRATEGIC_TOKENS.VerificationItemRepository, DrizzleVerificationItemRepository);
  container.registerSingleton(STRATEGIC_TOKENS.AnomalyRepository, DrizzleAnomalyRepository);
  container.registerSingleton(STRATEGIC_TOKENS.StandardProcedureRepository, DrizzleStandardProcedureRepository);
  container.registerSingleton(STRATEGIC_TOKENS.IdeaBoxRepository, DrizzleIdeaBoxRepository);
  container.registerSingleton(STRATEGIC_TOKENS.ActionPlanFollowUpRepository, DrizzleActionPlanFollowUpRepository);
  container.registerSingleton(STRATEGIC_TOKENS.SwotAnalysisRepository, DrizzleSwotRepository);
  container.registerSingleton(STRATEGIC_TOKENS.WarRoomMeetingRepository, DrizzleWarRoomMeetingRepository);
  container.registerSingleton(STRATEGIC_TOKENS.UserDashboardLayoutRepository, DrizzleUserDashboardLayoutRepository);
  
  // Use Cases - Commands (Fase F2)
  container.registerSingleton(STRATEGIC_TOKENS.CreateStrategyUseCase, CreateStrategyUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.CreateStrategyVersionUseCase, CreateStrategyVersionUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ActivateStrategyUseCase, ActivateStrategyUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.CreateGoalUseCase, CreateStrategicGoalUseCase);
  
  // Use Cases - Commands (Fase F3)
  container.registerSingleton(STRATEGIC_TOKENS.CascadeGoalUseCase, CascadeGoalUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.UpdateGoalProgressUseCase, UpdateGoalProgressUseCase);
  
  // Use Cases - Commands (Fase F4 - KPIs)
  container.registerSingleton(STRATEGIC_TOKENS.CreateKPIUseCase, CreateKPIUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.UpdateKPIValueUseCase, UpdateKPIValueUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.SyncKPIValuesUseCase, SyncKPIValuesUseCase);
  
  // Integrations (Fase F4)
  container.registerSingleton(STRATEGIC_TOKENS.FinancialKPIAdapter, FinancialKPIDataSource);
  container.registerSingleton(STRATEGIC_TOKENS.TMSKPIAdapter, TMSKPIDataSource);
  
  // Use Cases - Commands (Fase F6 - 5W2H + Follow-up 3G)
  container.registerSingleton(STRATEGIC_TOKENS.CreateActionPlanUseCase, CreateActionPlanUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.AdvancePDCAUseCase, AdvancePDCACycleUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ExecuteFollowUpUseCase, ExecuteFollowUpUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ReproposeActionPlanUseCase, ReproposeActionPlanUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.CreateSwotItemUseCase, CreateSwotItemCommand);

  // Use Cases - Commands (IdeaBox + WarRoom)
  container.registerSingleton(STRATEGIC_TOKENS.SubmitIdeaUseCase, SubmitIdeaUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ReviewIdeaUseCase, ReviewIdeaUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ConvertIdeaUseCase, ConvertIdeaUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.ScheduleMeetingUseCase, ScheduleMeetingUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.RecordDecisionUseCase, RecordDecisionUseCase);

  // Use Cases - Queries (Dashboard)
  container.registerSingleton(STRATEGIC_TOKENS.GetDashboardDataUseCase, GetDashboardDataQuery);
  
  // Use Cases - Queries (Fase F7 - War Room)
  container.registerSingleton(STRATEGIC_TOKENS.GenerateAgendaUseCase, GenerateAgendaUseCase);
  container.registerSingleton(STRATEGIC_TOKENS.GetStrategyUseCase, GetStrategyQuery);
  container.registerSingleton(STRATEGIC_TOKENS.ListGoalsUseCase, ListGoalsQuery);
  container.registerSingleton(STRATEGIC_TOKENS.GetKpiHistoryUseCase, GetKpiHistoryQuery);
  container.registerSingleton(STRATEGIC_TOKENS.GetWarRoomDashboardUseCase, GetWarRoomDashboardQuery);

  // Use Cases - Queries (Novos)
  container.registerSingleton(STRATEGIC_TOKENS.ListIdeasUseCase, ListIdeasQuery);
  container.registerSingleton(STRATEGIC_TOKENS.ListActionPlansUseCase, ListActionPlansQuery);
  container.registerSingleton(STRATEGIC_TOKENS.GetActionPlanTimelineUseCase, GetActionPlanTimelineQuery);
  container.registerSingleton(STRATEGIC_TOKENS.GetBSCDashboardUseCase, GetBSCDashboardQuery);
  container.registerSingleton(STRATEGIC_TOKENS.GetStrategicMapUseCase, GetStrategicMapQuery);
}
