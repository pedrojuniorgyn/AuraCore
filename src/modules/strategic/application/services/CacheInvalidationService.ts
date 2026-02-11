/**
 * Cache Invalidation Service
 * Gerencia invalidação de cache após mudanças de dados
 * 
 * @module strategic/application/services
 */
import { injectable } from 'tsyringe';
import { redisCache } from '@/lib/cache';
import { logger } from '@/shared/infrastructure/logging';

/**
 * Estratégia de invalidação:
 * - Commands que modificam dados DEVEM invalidar cache relacionado
 * - Invalidação por padrão (wildcard) para evitar cache stale
 * - TTL curtos (5-15min) como segunda linha de defesa
 */
@injectable()
export class CacheInvalidationService {
  /**
   * Invalida todo o cache do módulo strategic para uma organização
   * Usar após mudanças que afetam múltiplas entidades
   */
  async invalidateOrganization(organizationId: number, branchId: number): Promise<void> {
    const pattern = `*:${organizationId}:${branchId}:*`;
    await redisCache.invalidate(pattern, 'strategic');
    
    logger.info('[CacheInvalidation] Invalidated strategic cache', { organizationId, branchId });
  }

  /**
   * Invalida cache de dashboards (executivo + geral)
   */
  async invalidateDashboards(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`executive-dashboard:${organizationId}:${branchId}:*`, 'strategic:');
    await redisCache.invalidate(`dashboard-data:${organizationId}:${branchId}`, 'strategic:');
    
    logger.info('[CacheInvalidation] Invalidated dashboards', { organizationId, branchId });
  }

  /**
   * Invalida cache de KPIs
   * Chamar após: CreateKPI, UpdateKPI, DeleteKPI, UpdateKPIValue
   */
  async invalidateKPIs(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`kpi-list:${organizationId}:${branchId}:*`, 'strategic:');
    await redisCache.invalidate(`kpi-summary:${organizationId}:${branchId}`, 'strategic:');
    await this.invalidateDashboards(organizationId, branchId);
    
    logger.info('[CacheInvalidation] Invalidated KPIs', { organizationId, branchId });
  }

  /**
   * Invalida cache de Goals
   * Chamar após: CreateGoal, UpdateGoal, DeleteGoal
   */
  async invalidateGoals(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`goal-list:${organizationId}:${branchId}:*`, 'strategic:');
    await this.invalidateDashboards(organizationId, branchId);
    
    logger.info('[CacheInvalidation] Invalidated goals', { organizationId, branchId });
  }

  /**
   * Invalida cache de Action Plans
   * Chamar após: CreateActionPlan, UpdateActionPlan, DeleteActionPlan
   */
  async invalidateActionPlans(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`action-plan-list:${organizationId}:${branchId}:*`, 'strategic:');
    await this.invalidateDashboards(organizationId, branchId);
    
    logger.info('[CacheInvalidation] Invalidated action plans', { organizationId, branchId });
  }

  /**
   * Invalida cache de Strategies
   * Chamar após: CreateStrategy, UpdateStrategy, DeleteStrategy
   */
  async invalidateStrategies(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`strategy-list:${organizationId}:${branchId}:*`, 'strategic:');
    await this.invalidateDashboards(organizationId, branchId);
    
    logger.info('[CacheInvalidation] Invalidated strategies', { organizationId, branchId });
  }

  /**
   * Invalida cache de Department tree
   * Chamar após: CreateDepartment, UpdateDepartment, DeleteDepartment
   */
  async invalidateDepartments(organizationId: number, branchId: number): Promise<void> {
    await redisCache.invalidate(`department-tree:${organizationId}:${branchId}`, 'strategic:');
    
    logger.info('[CacheInvalidation] Invalidated departments', { organizationId, branchId });
  }

  /**
   * Invalida cache específico de uma entidade
   */
  async invalidateEntity(
    entityType: 'strategy' | 'goal' | 'kpi' | 'action-plan',
    entityId: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await redisCache.delete(`${entityType}:${entityId}`, 'strategic:');
    
    // Também invalida listas relacionadas
    switch (entityType) {
      case 'kpi':
        await this.invalidateKPIs(organizationId, branchId);
        break;
      case 'goal':
        await this.invalidateGoals(organizationId, branchId);
        break;
      case 'action-plan':
        await this.invalidateActionPlans(organizationId, branchId);
        break;
      case 'strategy':
        await this.invalidateStrategies(organizationId, branchId);
        break;
    }
  }
}
