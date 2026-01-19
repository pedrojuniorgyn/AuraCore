/**
 * Módulo DI Strategic
 * Registra dependencies do módulo de gestão estratégica
 * 
 * @module strategic/infrastructure/di
 */
// import { container } from 'tsyringe';
// import { STRATEGIC_TOKENS } from './tokens';

// Repositories (a serem implementados nas próximas fases)
// import { DrizzleStrategyRepository } from '../persistence/repositories/DrizzleStrategyRepository';
// import { DrizzleStrategicGoalRepository } from '../persistence/repositories/DrizzleStrategicGoalRepository';
// import { DrizzleActionPlanRepository } from '../persistence/repositories/DrizzleActionPlanRepository';
// import { DrizzleIdeaBoxRepository } from '../persistence/repositories/DrizzleIdeaBoxRepository';

export function registerStrategicModule(): void {
  // NOTA: Os repositories serão implementados nas próximas fases (F2+)
  // Por enquanto, apenas registramos os tokens para documentação
  
  // Repositories
  // container.register(STRATEGIC_TOKENS.StrategyRepository, {
  //   useClass: DrizzleStrategyRepository,
  // });
  
  // container.register(STRATEGIC_TOKENS.StrategicGoalRepository, {
  //   useClass: DrizzleStrategicGoalRepository,
  // });
  
  // container.register(STRATEGIC_TOKENS.ActionPlanRepository, {
  //   useClass: DrizzleActionPlanRepository,
  // });
  
  // container.register(STRATEGIC_TOKENS.IdeaBoxRepository, {
  //   useClass: DrizzleIdeaBoxRepository,
  // });
  
  console.log('[Strategic Module] DI tokens definidos - repositories serão registrados na fase F2');
}
