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
import { DrizzleActionPlanRepository } from '../persistence/repositories/DrizzleActionPlanRepository';
import { DrizzleKPIRepository } from '../persistence/repositories/DrizzleKPIRepository';
import { DrizzleIdeaBoxRepository } from '../persistence/repositories/DrizzleIdeaBoxRepository';

export function registerStrategicModule(): void {
  // Repositories - Fase F1 Complete
  container.register(STRATEGIC_TOKENS.StrategyRepository, {
    useClass: DrizzleStrategyRepository,
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
  
  // NOTA: Os demais repositories e use cases serão registrados nas próximas fases (F2+)
  // - StrategicGoalRepository (requer GoalCascade)
  // - ActionPlanFollowUpRepository
  // - WarRoomMeetingRepository
  // - SwotAnalysisRepository
  
  console.log('[Strategic Module] DI registrado: 4 repositories (Strategy, ActionPlan, KPI, IdeaBox)');
}
