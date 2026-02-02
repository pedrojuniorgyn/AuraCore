/**
 * Port Output: IStrategicGoalRepository
 * Interface do repositório de metas estratégicas
 * 
 * @module strategic/domain/ports/output
 */
import type { StrategicGoal } from '../../entities/StrategicGoal';

export interface GoalFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)

  /**
   * Filtra goals por strategy via perspectivas (Goal não tem coluna strategyId).
   * O repository usa subquery: perspectiveId IN (SELECT id FROM bsc_perspective WHERE strategyId = ?)
   */
  strategyId?: string;

  perspectiveId?: string;
  parentGoalId?: string;
  cascadeLevel?: string;
  status?: string;
  ownerUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface IStrategicGoalRepository {
  /**
   * Busca meta por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<StrategicGoal | null>;

  /**
   * Busca meta por código
   */
  findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<StrategicGoal | null>;

  /**
   * Lista metas com paginação
   */
  findMany(filter: GoalFilter): Promise<{
    items: StrategicGoal[];
    total: number;
  }>;
  
  /**
   * Busca metas filhas de uma meta pai
   */
  findByParentId(
    parentGoalId: string,
    organizationId: number, 
    branchId: number
  ): Promise<StrategicGoal[]>;
  
  /**
   * Busca metas por perspectiva
   */
  findByPerspective(
    perspectiveId: string,
    organizationId: number, 
    branchId: number
  ): Promise<StrategicGoal[]>;
  
  /**
   * Busca metas por nível de cascateamento
   */
  findByCascadeLevel(
    cascadeLevel: string,
    organizationId: number, 
    branchId: number
  ): Promise<StrategicGoal[]>;
  
  /**
   * Busca metas raiz (sem parent)
   */
  findRootGoals(
    organizationId: number, 
    branchId: number
  ): Promise<StrategicGoal[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: StrategicGoal): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;

  /**
   * Adiciona uma versão de valor (ACTUAL, BUDGET, FORECAST)
   */
  addValueVersion(params: {
    goalId: string;
    organizationId: number;
    branchId: number;
    valueType: 'ACTUAL' | 'BUDGET' | 'FORECAST';
    periodStart: Date;
    periodEnd: Date;
    targetValue: number;
  }): Promise<void>;
}
