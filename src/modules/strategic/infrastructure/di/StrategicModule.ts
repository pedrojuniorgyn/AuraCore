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

// Use Cases - Commands
import { CreateStrategyUseCase } from '../../application/commands/CreateStrategyUseCase';
import { ActivateStrategyUseCase } from '../../application/commands/ActivateStrategyUseCase';
import { CreateStrategicGoalUseCase } from '../../application/commands/CreateStrategicGoalUseCase';
import { CascadeGoalUseCase } from '../../application/commands/CascadeGoalUseCase';
import { UpdateGoalProgressUseCase } from '../../application/commands/UpdateGoalProgressUseCase';

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
  
  // NOTA: Demais repositories e use cases serão registrados nas próximas fases (F4+)
  // - ActionPlanFollowUpRepository
  // - WarRoomMeetingRepository
  // - SwotAnalysisRepository
  
  console.log('[Strategic Module] DI registrado: 5 repositories + 5 use cases');
}
