/**
 * Port Output: IStandardProcedureRepository
 * Interface do repositório de padrões
 * 
 * @module strategic/domain/ports/output
 */
import type { StandardProcedure } from '../../entities/StandardProcedure';

export interface StandardProcedureFilter {
  organizationId: number;
  branchId: number; // NUNCA opcional (SCHEMA-003)
  status?: string;
  ownerUserId?: string;
  department?: string;
  processName?: string;
  sourceActionPlanId?: string;
  needsReview?: boolean;
  page?: number;
  pageSize?: number;
}

export interface IStandardProcedureRepository {
  /**
   * Busca padrão por ID
   */
  findById(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<StandardProcedure | null>;
  
  /**
   * Busca padrão por código
   */
  findByCode(
    code: string, 
    organizationId: number, 
    branchId: number
  ): Promise<StandardProcedure | null>;
  
  /**
   * Lista padrões com paginação
   */
  findMany(filter: StandardProcedureFilter): Promise<{
    items: StandardProcedure[];
    total: number;
  }>;
  
  /**
   * Busca padrão originado de um plano de ação
   */
  findBySourceActionPlanId(
    actionPlanId: string,
    organizationId: number, 
    branchId: number
  ): Promise<StandardProcedure | null>;
  
  /**
   * Lista padrões que precisam de revisão
   */
  findNeedingReview(
    organizationId: number, 
    branchId: number
  ): Promise<StandardProcedure[]>;
  
  /**
   * Lista padrões ativos por departamento
   */
  findActiveByDepartment(
    department: string,
    organizationId: number, 
    branchId: number
  ): Promise<StandardProcedure[]>;
  
  /**
   * Salva (insert ou update)
   */
  save(entity: StandardProcedure): Promise<void>;
  
  /**
   * Soft delete
   */
  delete(
    id: string, 
    organizationId: number, 
    branchId: number
  ): Promise<void>;
}
