import { injectable } from 'tsyringe';
import { db, getDbRows } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type AlertType = 'KPI_CRITICAL' | 'ANOMALY_HIGH' | 'VARIANCE_UNFAVORABLE' | 'ACTION_PLAN_OVERDUE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  entityType: string;
  entityId: string;
  entityCode?: string;
  entityName?: string;
  title: string;
  message: string;
  notifyUserIds?: string[];
  notifyEmails?: string[];
  status: AlertStatus;
  metadata?: Record<string, unknown>;
}

export interface AlertCheckResult {
  alertType: AlertType;
  count: number;
  alerts: Alert[];
}

@injectable()
export class AlertService {
  /**
   * Verifica todas as condições de alerta e gera alertas pendentes
   */
  async checkAllAlerts(organizationId: number, branchId: number): Promise<AlertCheckResult[]> {
    const results: AlertCheckResult[] = [];

    // 1. KPIs em status CRITICAL
    const kpiAlerts = await this.checkKPICritical(organizationId, branchId);
    if (kpiAlerts.length > 0) {
      results.push({ alertType: 'KPI_CRITICAL', count: kpiAlerts.length, alerts: kpiAlerts });
    }

    // 2. Anomalias HIGH/CRITICAL abertas
    const anomalyAlerts = await this.checkAnomaliesHigh(organizationId, branchId);
    if (anomalyAlerts.length > 0) {
      results.push({ alertType: 'ANOMALY_HIGH', count: anomalyAlerts.length, alerts: anomalyAlerts });
    }

    // 3. Variâncias UNFAVORABLE > 10%
    const varianceAlerts = await this.checkVarianceUnfavorable(organizationId, branchId);
    if (varianceAlerts.length > 0) {
      results.push({ alertType: 'VARIANCE_UNFAVORABLE', count: varianceAlerts.length, alerts: varianceAlerts });
    }

    // 4. Action Plans atrasados > 7 dias
    const overdueAlerts = await this.checkActionPlansOverdue(organizationId, branchId);
    if (overdueAlerts.length > 0) {
      results.push({ alertType: 'ACTION_PLAN_OVERDUE', count: overdueAlerts.length, alerts: overdueAlerts });
    }

    return results;
  }

  private async checkKPICritical(orgId: number, branchId: number): Promise<Alert[]> {
    const result = await db.execute(sql`
      SELECT kpi_id, code, name, current_value, target_value, calculated_status
      FROM vw_kpi_performance
      WHERE organization_id = ${orgId}
        AND branch_id = ${branchId}
        AND calculated_status = 'CRITICAL'
        AND kpi_id NOT IN (
          SELECT entity_id FROM strategic_alert_log
          WHERE organization_id = ${orgId}
            AND alert_type = 'KPI_CRITICAL'
            AND status IN ('PENDING', 'SENT')
            AND created_at > DATEADD(day, -1, GETDATE())
        )
    `);

    return getDbRows(result).map(row => ({
      id: crypto.randomUUID(),
      alertType: 'KPI_CRITICAL' as AlertType,
      severity: 'CRITICAL' as AlertSeverity,
      entityType: 'KPI',
      entityId: row.kpi_id,
      entityCode: row.code,
      entityName: row.name,
      title: `KPI em estado CRÍTICO: ${row.code}`,
      message: `O KPI "${row.name}" (${row.code}) está em estado crítico. Valor atual: ${row.current_value}, Meta: ${row.target_value}.`,
      status: 'PENDING' as AlertStatus,
      metadata: { currentValue: row.current_value, targetValue: row.target_value },
    }));
  }

  private async checkAnomaliesHigh(orgId: number, branchId: number): Promise<Alert[]> {
    const result = await db.execute(sql`
      SELECT a.id, a.code, a.title, a.severity, a.status, a.created_at
      FROM strategic_anomaly a
      WHERE a.organization_id = ${orgId}
        AND a.branch_id = ${branchId}
        AND a.severity IN ('HIGH', 'CRITICAL')
        AND a.status = 'OPEN'
        AND a.deleted_at IS NULL
        AND a.id NOT IN (
          SELECT entity_id FROM strategic_alert_log
          WHERE organization_id = ${orgId}
            AND alert_type = 'ANOMALY_HIGH'
            AND status IN ('PENDING', 'SENT')
            AND created_at > DATEADD(day, -1, GETDATE())
        )
    `);

    return getDbRows(result).map(row => ({
      id: crypto.randomUUID(),
      alertType: 'ANOMALY_HIGH' as AlertType,
      severity: row.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING' as AlertSeverity,
      entityType: 'ANOMALY',
      entityId: row.id,
      entityCode: row.code,
      entityName: row.title,
      title: `Anomalia ${row.severity}: ${row.code}`,
      message: `Anomalia "${row.title}" de severidade ${row.severity} está aberta desde ${row.created_at}.`,
      status: 'PENDING' as AlertStatus,
      metadata: { severity: row.severity, openedAt: row.created_at },
    }));
  }

  private async checkVarianceUnfavorable(orgId: number, branchId: number): Promise<Alert[]> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const result = await db.execute(sql`
      SELECT kpi_id, kpi_code, kpi_name, actual_value, budget_value,
             variance_actual_budget_pct, variance_status
      FROM vw_kpi_variance_analysis
      WHERE organization_id = ${orgId}
        AND branch_id = ${branchId}
        AND period_year = ${currentYear}
        AND period_month = ${currentMonth}
        AND variance_status = 'UNFAVORABLE'
        AND ABS(variance_actual_budget_pct) > 10
        AND kpi_id NOT IN (
          SELECT entity_id FROM strategic_alert_log
          WHERE organization_id = ${orgId}
            AND alert_type = 'VARIANCE_UNFAVORABLE'
            AND status IN ('PENDING', 'SENT')
            AND created_at > DATEADD(day, -7, GETDATE())
        )
    `);

    return getDbRows(result).map(row => ({
      id: crypto.randomUUID(),
      alertType: 'VARIANCE_UNFAVORABLE' as AlertType,
      severity: Math.abs(row.variance_actual_budget_pct) > 20 ? 'CRITICAL' : 'WARNING' as AlertSeverity,
      entityType: 'VARIANCE',
      entityId: row.kpi_id,
      entityCode: row.kpi_code,
      entityName: row.kpi_name,
      title: `Variância desfavorável: ${row.kpi_code}`,
      message: `O KPI "${row.kpi_name}" tem variância de ${row.variance_actual_budget_pct.toFixed(1)}% em relação ao orçamento. Atual: ${row.actual_value}, Budget: ${row.budget_value}.`,
      status: 'PENDING' as AlertStatus,
      metadata: {
        actual: row.actual_value,
        budget: row.budget_value,
        variancePct: row.variance_actual_budget_pct
      },
    }));
  }

  private async checkActionPlansOverdue(orgId: number, branchId: number): Promise<Alert[]> {
    const result = await db.execute(sql`
      SELECT ap.id, ap.code, ap.what, ap.who, ap.when_end,
             DATEDIFF(day, ap.when_end, GETDATE()) as days_overdue
      FROM strategic_action_plan ap
      WHERE ap.organization_id = ${orgId}
        AND ap.branch_id = ${branchId}
        AND ap.status NOT IN ('COMPLETED', 'CANCELLED')
        AND ap.when_end < GETDATE()
        AND DATEDIFF(day, ap.when_end, GETDATE()) > 7
        AND ap.deleted_at IS NULL
        AND ap.id NOT IN (
          SELECT entity_id FROM strategic_alert_log
          WHERE organization_id = ${orgId}
            AND alert_type = 'ACTION_PLAN_OVERDUE'
            AND status IN ('PENDING', 'SENT')
            AND created_at > DATEADD(day, -7, GETDATE())
        )
    `);

    return getDbRows(result).map(row => ({
      id: crypto.randomUUID(),
      alertType: 'ACTION_PLAN_OVERDUE' as AlertType,
      severity: row.days_overdue > 14 ? 'CRITICAL' : 'WARNING' as AlertSeverity,
      entityType: 'ACTION_PLAN',
      entityId: row.id,
      entityCode: row.code,
      entityName: row.what,
      title: `Plano de ação atrasado: ${row.code}`,
      message: `O plano de ação "${row.what}" (responsável: ${row.who}) está atrasado há ${row.days_overdue} dias. Prazo original: ${row.when_end}.`,
      status: 'PENDING' as AlertStatus,
      metadata: {
        responsible: row.who,
        deadline: row.when_end,
        daysOverdue: row.days_overdue
      },
    }));
  }

  /**
   * Salva alertas gerados no banco
   */
  async saveAlerts(orgId: number, branchId: number, alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await db.execute(sql`
        INSERT INTO strategic_alert_log (
          id, organization_id, branch_id, alert_type, severity,
          entity_type, entity_id, entity_code, entity_name,
          title, message, status, metadata
        ) VALUES (
          ${alert.id}, ${orgId}, ${branchId}, ${alert.alertType}, ${alert.severity},
          ${alert.entityType}, ${alert.entityId}, ${alert.entityCode || null}, ${alert.entityName || null},
          ${alert.title}, ${alert.message}, ${alert.status}, ${JSON.stringify(alert.metadata || {})}
        )
      `);
    }
  }

  /**
   * Busca alertas pendentes
   */
  async getPendingAlerts(orgId: number, branchId: number): Promise<Alert[]> {
    const result = await db.execute(sql`
      SELECT * FROM strategic_alert_log
      WHERE organization_id = ${orgId}
        AND branch_id = ${branchId}
        AND status = 'PENDING'
      ORDER BY
        CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
        created_at DESC
    `);

    return getDbRows(result).map(row => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityCode: row.entity_code,
      entityName: row.entity_name,
      title: row.title,
      message: row.message,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Marca alerta como reconhecido
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await db.execute(sql`
      UPDATE strategic_alert_log
      SET status = 'ACKNOWLEDGED',
          acknowledged_at = GETDATE(),
          acknowledged_by = ${userId},
          updated_at = GETDATE()
      WHERE id = ${alertId}
    `);
  }

  /**
   * Marca alerta como resolvido
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await db.execute(sql`
      UPDATE strategic_alert_log
      SET status = 'RESOLVED',
          resolved_at = GETDATE(),
          resolved_by = ${userId},
          updated_at = GETDATE()
      WHERE id = ${alertId}
    `);
  }
}
