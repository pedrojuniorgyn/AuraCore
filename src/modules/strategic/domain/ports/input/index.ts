/**
 * Input Ports do Módulo Strategic
 * 
 * @module strategic/domain/ports/input
 */
export type { 
  ICreateStrategyUseCase, 
  CreateStrategyInput, 
  CreateStrategyOutput 
} from './ICreateStrategyUseCase';

export type { 
  IActivateStrategyUseCase, 
  ActivateStrategyInput 
} from './IActivateStrategyUseCase';

export type { 
  ICreateStrategicGoalUseCase, 
  CreateStrategicGoalInput, 
  CreateStrategicGoalOutput 
} from './ICreateStrategicGoalUseCase';

export type { 
  ICascadeGoalUseCase, 
  CascadeGoalInput, 
  CascadeGoalOutput 
} from './ICascadeGoalUseCase';

export type {
  IUpdateGoalProgressUseCase,
  UpdateGoalProgressInput,
  UpdateGoalProgressOutput
} from './IUpdateGoalProgressUseCase';

export type { IReproposeActionPlanUseCase } from './IReproposeActionPlanUseCase';
