/**
 * Integração: TMSKPIDataSource
 * Fonte de dados de KPIs do módulo TMS (Transport Management)
 * 
 * Queries disponíveis:
 * - delivery.otd: On-Time Delivery Rate (%)
 * - delivery.lead_time: Lead Time médio (horas)
 * - delivery.damage_rate: Taxa de avarias (%)
 * - shipments.monthly: Total de embarques no mês
 * - fleet.utilization: Taxa de utilização da frota (%)
 * 
 * @module strategic/infrastructure/integrations
 */
import { injectable } from 'tsyringe';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { IKPIDataSource, KPIDataPoint } from './IKPIDataSource';

@injectable()
export class TMSKPIDataSource implements IKPIDataSource {
  readonly moduleName = 'tms';

  private readonly queries: Record<string, string> = {
    'delivery.otd': `
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN (CAST(SUM(CASE WHEN delivered_at <= expected_delivery_date THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100
          ELSE 0
        END as value
      FROM tms_shipments
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status = 'DELIVERED'
        AND MONTH(delivered_at) = MONTH(GETDATE())
        AND YEAR(delivered_at) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'delivery.lead_time': `
      SELECT COALESCE(AVG(CAST(DATEDIFF(hour, pickup_date, delivered_at) AS FLOAT)), 0) as value
      FROM tms_shipments
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status = 'DELIVERED'
        AND delivered_at IS NOT NULL
        AND pickup_date IS NOT NULL
        AND MONTH(delivered_at) = MONTH(GETDATE())
        AND YEAR(delivered_at) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'delivery.damage_rate': `
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN (CAST(SUM(CASE WHEN has_damage = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100
          ELSE 0
        END as value
      FROM tms_shipments
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND status = 'DELIVERED'
        AND MONTH(delivered_at) = MONTH(GETDATE())
        AND YEAR(delivered_at) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'shipments.monthly': `
      SELECT COUNT(*) as value
      FROM tms_shipments
      WHERE organization_id = @orgId AND branch_id = @branchId
        AND MONTH(created_at) = MONTH(GETDATE())
        AND YEAR(created_at) = YEAR(GETDATE())
        AND deleted_at IS NULL
    `,
    'fleet.utilization': `
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT v.id) > 0 
          THEN (CAST(COUNT(DISTINCT s.vehicle_id) AS FLOAT) / COUNT(DISTINCT v.id)) * 100
          ELSE 0
        END as value
      FROM fleet_vehicles v
      LEFT JOIN tms_shipments s ON s.vehicle_id = v.id 
        AND MONTH(s.created_at) = MONTH(GETDATE())
        AND YEAR(s.created_at) = YEAR(GETDATE())
        AND s.deleted_at IS NULL
      WHERE v.organization_id = @orgId AND v.branch_id = @branchId
        AND v.status = 'ACTIVE'
        AND v.deleted_at IS NULL
    `,
  };

  async executeQuery(
    query: string,
    organizationId: number,
    branchId: number
  ): Promise<KPIDataPoint | null> {
    const queryTemplate = this.queries[query];

    if (!queryTemplate) {
      console.warn(`[TMSKPIDataSource] Query não encontrada: ${query}`);
      return null;
    }

    try {
      const sqlQuery = queryTemplate
        .replace(/@orgId/g, String(organizationId))
        .replace(/@branchId/g, String(branchId));

      const result = await db.execute(sql.raw(sqlQuery));
      const rows = (result.recordset || result) as unknown as Array<{ value: number | null }>;

      if (rows.length === 0 || rows[0].value === null) {
        return null;
      }

      return {
        value: Number(rows[0].value),
        periodDate: new Date(),
        metadata: { query, source: 'tms' },
      };
    } catch (error) {
      console.error(`[TMSKPIDataSource] Erro ao executar query ${query}:`, error);
      return null;
    }
  }

  getAvailableQueries(): { id: string; name: string; description: string }[] {
    return [
      { id: 'delivery.otd', name: 'On-Time Delivery', description: 'Percentual de entregas no prazo' },
      { id: 'delivery.lead_time', name: 'Lead Time Médio', description: 'Tempo médio de entrega em horas' },
      { id: 'delivery.damage_rate', name: 'Taxa de Avarias', description: 'Percentual de entregas com avarias' },
      { id: 'shipments.monthly', name: 'Embarques Mensais', description: 'Total de embarques no mês' },
      { id: 'fleet.utilization', name: 'Utilização da Frota', description: 'Percentual de veículos utilizados no mês' },
    ];
  }
}
