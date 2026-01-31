/**
 * Strategic Views Helper
 *
 * Helper para facilitar o uso das views SQL criadas na migration 0046.
 * Move cálculos pesados do JavaScript para o banco de dados.
 *
 * @see drizzle/migrations/0046_create_strategic_views.sql
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const StrategicViews = {
  /**
   * Retorna resumo de Goals por Perspectiva BSC
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   */
  async getGoalsSummary(organizationId: number, branchId: number) {
    return db.execute(sql`
      SELECT * FROM vw_strategic_goals_summary
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);
  },

  /**
   * Retorna performance de KPIs com status calculado no banco
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   * @param goalId - (Opcional) Filtrar por objetivo estratégico
   */
  async getKPIPerformance(organizationId: number, branchId: number, goalId?: string) {
    const baseQuery = sql`
      SELECT * FROM vw_kpi_performance
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `;
    if (goalId) {
      return db.execute(sql`${baseQuery} AND goal_id = ${goalId}`);
    }
    return db.execute(baseQuery);
  },

  /**
   * Retorna métricas de Action Plans para Kanban
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   */
  async getActionPlansKanban(organizationId: number, branchId: number) {
    return db.execute(sql`
      SELECT * FROM vw_action_plans_kanban
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);
  },

  /**
   * Retorna Control Items com status de verificação calculado
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   */
  async getControlItemsStatus(organizationId: number, branchId: number) {
    return db.execute(sql`
      SELECT * FROM vw_control_items_status
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);
  },

  /**
   * Retorna resumo de anomalias por severidade
   * @param organizationId - ID da organização
   * @param branchId - ID da filial
   */
  async getAnomaliesSummary(organizationId: number, branchId: number) {
    return db.execute(sql`
      SELECT * FROM vw_anomalies_summary
      WHERE organization_id = ${organizationId} AND branch_id = ${branchId}
    `);
  },
};
