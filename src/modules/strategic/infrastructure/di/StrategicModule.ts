/**
 * Módulo DI Strategic
 * Registra dependencies do módulo de gestão estratégica
 * 
 * @module strategic/infrastructure/di
 */
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from './tokens';

// Repositories
import { DrizzleStrategyRepository } from '../persistence/repositories/DrizzleStrategyRepository';
import { DrizzleStrategicGoalRepository } from '../persistence/repositories/DrizzleStrategicGoalRepository';
import { DrizzleActionPlanRepository } from '../persistence/repositories/DrizzleActionPlanRepository';
import { DrizzleKPIRepository } from '../persistence/repositories/DrizzleKPIRepository';
import { DrizzleIdeaBoxRepository } from '../persistence/repositories/DrizzleIdeaBoxRepository';
import { DrizzleActionPlanFollowUpRepository } from '../persistence/repositories/DrizzleActionPlanFollowUpRepository';
import { DrizzleSwotRepository } from '../persistence/repositories/DrizzleSwotRepository';
import { DrizzleWarRoomMeetingRepository } from '../persistence/repositories/DrizzleWarRoomMeetingRepository';

// Use Cases - Commands
import { CreateStrategyUseCase } from '../../application/commands/CreateStrategyUseCase';
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

// Use Cases - Queries
import { GenerateAgendaUseCase } from '../../application/queries/GenerateAgendaUseCase';
import { GetStrategyQuery } from '../../application/queries/GetStrategyQuery';
import { ListGoalsQuery } from '../../application/queries/ListGoalsQuery';
import { GetKpiHistoryQuery } from '../../application/queries/GetKpiHistoryQuery';
import { GetWarRoomDashboardQuery } from '../../application/queries/GetWarRoomDashboardQuery';
import { GetDashboardDataQuery } from '../../application/queries/GetDashboardDataQuery';

// Integrations
import { FinancialKPIDataSource } from '../integrations/FinancialKPIDataSource';
import { TMSKPIDataSource } from '../integrations/TMSKPIDataSource';

export function registerStrategicModule(): void {
  // Repositories - Fase F1 + F2
  container.register(STRATEGIC_TOKENS.StrategyRepository, {
    useClass: DrizzleStrategyRepository,
  });
  
  container.register(STRATEGIC_TOKENS.StrategicGoalRepository, {
    useClass: DrizzleStrategicGoalRepository,
  });
  
  container.register(STRATEGIC_TOKENS.ActionPlanRepository, {
    useClass: DrizzleActionPlanRepository,
  });
  
  container.register(STRATEGIC_TOKENS.KPIRepository, {
    useClass: DrizzleKPIRepository,
  });
  
  container.register(STRATEGIC_TOKENS.IdeaBoxRepository, {
    useClass: DrizzleIdeaBoxRepository,
  });
  
  container.register(STRATEGIC_TOKENS.ActionPlanFollowUpRepository, {
    useClass: DrizzleActionPlanFollowUpRepository,
  });
  
  container.register(STRATEGIC_TOKENS.SwotAnalysisRepository, {
    useClass: DrizzleSwotRepository,
  });
  
  container.register(STRATEGIC_TOKENS.WarRoomMeetingRepository, {
    useClass: DrizzleWarRoomMeetingRepository,
  });
  
  // Use Cases - Commands (Fase F2)
  container.register(STRATEGIC_TOKENS.CreateStrategyUseCase, {
    useClass: CreateStrategyUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.ActivateStrategyUseCase, {
    useClass: ActivateStrategyUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.CreateGoalUseCase, {
    useClass: CreateStrategicGoalUseCase,
  });
  
  // Use Cases - Commands (Fase F3)
  container.register(STRATEGIC_TOKENS.CascadeGoalUseCase, {
    useClass: CascadeGoalUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.UpdateGoalProgressUseCase, {
    useClass: UpdateGoalProgressUseCase,
  });
  
  // Use Cases - Commands (Fase F4 - KPIs)
  container.register(STRATEGIC_TOKENS.CreateKPIUseCase, {
    useClass: CreateKPIUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.UpdateKPIValueUseCase, {
    useClass: UpdateKPIValueUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.SyncKPIValuesUseCase, {
    useClass: SyncKPIValuesUseCase,
  });
  
  // Integrations (Fase F4)
  container.register(STRATEGIC_TOKENS.FinancialKPIAdapter, {
    useClass: FinancialKPIDataSource,
  });
  
  container.register(STRATEGIC_TOKENS.TMSKPIAdapter, {
    useClass: TMSKPIDataSource,
  });
  
  // Use Cases - Commands (Fase F6 - 5W2H + Follow-up 3G)
  container.register(STRATEGIC_TOKENS.CreateActionPlanUseCase, {
    useClass: CreateActionPlanUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.AdvancePDCAUseCase, {
    useClass: AdvancePDCACycleUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.ExecuteFollowUpUseCase, {
    useClass: ExecuteFollowUpUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.CreateSwotItemUseCase, {
    useClass: CreateSwotItemCommand,
  });
  
  // Use Cases - Queries (Dashboard)
  container.register(STRATEGIC_TOKENS.GetDashboardDataUseCase, {
    useClass: GetDashboardDataQuery,
  });
  
  // Use Cases - Queries (Fase F7 - War Room)
  container.register(STRATEGIC_TOKENS.GenerateAgendaUseCase, {
    useClass: GenerateAgendaUseCase,
  });
  
  container.register(STRATEGIC_TOKENS.GetStrategyUseCase, {
    useClass: GetStrategyQuery,
  });
  
  container.register(STRATEGIC_TOKENS.ListGoalsUseCase, {
    useClass: ListGoalsQuery,
  });
  
  container.register(STRATEGIC_TOKENS.GetKpiHistoryUseCase, {
    useClass: GetKpiHistoryQuery,
  });
  
  container.register(STRATEGIC_TOKENS.GetWarRoomDashboardUseCase, {
    useClass: GetWarRoomDashboardQuery,
  });
  
  console.log('[Strategic Module] DI registrado: 8 repositories + 18 use cases + 2 integrations');
}
