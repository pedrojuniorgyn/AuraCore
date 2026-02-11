/**
 * CheckMaintenanceAlertsJob - E10 Phase 2
 * Verificação de alertas de manutenção de veículos
 *
 * Migrado de: src/services/cron/check-maintenance-alerts.ts
 *
 * @description Executa diariamente às 8h, verificando planos de manutenção
 * e criando alertas para manutenções próximas.
 *
 * E10.2.1: Corrigido SQL Injection - todas as queries agora usam parâmetros
 */

import { injectable } from 'tsyringe';
import { pool, ensureConnection } from '@/lib/db';

import { logger } from '@/shared/infrastructure/logging';
export interface ICheckMaintenanceAlertsJob {
  execute(): Promise<MaintenanceAlertResult>;
}

export interface MaintenanceAlertResult {
  success: boolean;
  vehiclesChecked: number;
  alertsCreated: number;
  processedAt: Date;
  error?: string;
}

@injectable()
export class CheckMaintenanceAlertsJob implements ICheckMaintenanceAlertsJob {
  /**
   * Executa a verificação de alertas de manutenção
   */
  async execute(): Promise<MaintenanceAlertResult> {
    const result: MaintenanceAlertResult = {
      success: true,
      vehiclesChecked: 0,
      alertsCreated: 0,
      processedAt: new Date(),
    };

    try {
      logger.info('🔧 [CheckMaintenanceAlertsJob] Verificando planos de manutenção...');

      await ensureConnection();

      // Buscar todos os veículos ativos (query sem parâmetros externos - segura)
      const vehiclesResult = await pool.request().query(`
        SELECT 
          v.id,
          v.organization_id,
          v.plate,
          v.odometer,
          v.model
        FROM vehicles v
        WHERE v.status = 'ACTIVE'
        AND v.deleted_at IS NULL
      `);

      const vehicles = vehiclesResult.recordset;
      result.vehiclesChecked = vehicles.length;
      logger.info(`📊 [CheckMaintenanceAlertsJob] Encontrados ${vehicles.length} veículos ativos`);

      // Para cada veículo, verificar planos aplicáveis
      for (const vehicle of vehicles) {
        // ✅ SEGURO: Query parametrizada para planos de manutenção
        const plansRequest = pool.request();
        plansRequest.input('organizationId', vehicle.organization_id);
        plansRequest.input('vehicleModel', vehicle.model);

        const plansResult = await plansRequest.query(`
          SELECT * FROM vehicle_maintenance_plans
          WHERE organization_id = @organizationId
          AND is_active = 'S'
          AND (vehicle_model = @vehicleModel OR vehicle_model IS NULL)
        `);

        const plans = plansResult.recordset;

        for (const plan of plans) {
          let shouldAlert = false;
          let alertMessage = '';
          let nextServiceOdometer: number | null = null;
          let nextServiceDate: string | null = null;

          // ✅ SEGURO: Query parametrizada para verificar alerta existente
          const existingAlertRequest = pool.request();
          existingAlertRequest.input('vehicleId', vehicle.id);
          existingAlertRequest.input('planId', plan.id);

          const existingAlertResult = await existingAlertRequest.query(`
            SELECT * FROM maintenance_alerts
            WHERE vehicle_id = @vehicleId
            AND maintenance_plan_id = @planId
            AND status = 'ACTIVE'
          `);

          if (existingAlertResult.recordset.length > 0) {
            continue; // Já existe alerta ativo
          }

          // Verificar trigger por KM
          if (plan.trigger_type === 'MILEAGE' || plan.trigger_type === 'BOTH') {
            if (plan.mileage_interval && vehicle.odometer) {
              // ✅ SEGURO: Query parametrizada para última manutenção
              const lastServiceRequest = pool.request();
              lastServiceRequest.input('vehicleId', vehicle.id);

              const lastServiceResult = await lastServiceRequest.query(`
                SELECT TOP 1 odometer
                FROM maintenance_work_orders
                WHERE vehicle_id = @vehicleId
                AND wo_type = 'PREVENTIVE'
                AND status = 'COMPLETED'
                ORDER BY completed_at DESC
              `);

              const lastServiceOdometer =
                lastServiceResult.recordset.length > 0
                  ? lastServiceResult.recordset[0].odometer
                  : 0;

              nextServiceOdometer = lastServiceOdometer + plan.mileage_interval;
              const kmRemaining = (nextServiceOdometer ?? 0) - vehicle.odometer;

              if (kmRemaining <= (plan.advance_warning_km || 0)) {
                shouldAlert = true;
                // Sanitizar nome do serviço para evitar injection em logs
                const sanitizedServiceName = String(plan.service_name).replace(
                  /['"]/g,
                  ''
                );
                alertMessage = `Manutenção "${sanitizedServiceName}" próxima: faltam ${kmRemaining} km`;
              }
            }
          }

          // Verificar trigger por tempo
          if (plan.trigger_type === 'TIME' || plan.trigger_type === 'BOTH') {
            if (plan.time_interval_months) {
              // ✅ SEGURO: Query parametrizada para última manutenção
              const lastServiceRequest = pool.request();
              lastServiceRequest.input('vehicleId', vehicle.id);

              const lastServiceResult = await lastServiceRequest.query(`
                SELECT TOP 1 completed_at
                FROM maintenance_work_orders
                WHERE vehicle_id = @vehicleId
                AND wo_type = 'PREVENTIVE'
                AND status = 'COMPLETED'
                ORDER BY completed_at DESC
              `);

              const lastServiceDate =
                lastServiceResult.recordset.length > 0
                  ? new Date(lastServiceResult.recordset[0].completed_at)
                  : new Date(
                      Date.now() -
                        plan.time_interval_months * 30 * 24 * 60 * 60 * 1000
                    );

              const nextServiceDateCalc = new Date(lastServiceDate);
              nextServiceDateCalc.setMonth(
                nextServiceDateCalc.getMonth() + plan.time_interval_months
              );

              nextServiceDate = nextServiceDateCalc.toISOString();

              const daysRemaining = Math.floor(
                (nextServiceDateCalc.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              );

              if (daysRemaining <= (plan.advance_warning_days || 0)) {
                shouldAlert = true;
                // Sanitizar nome do serviço para evitar injection em logs
                const sanitizedServiceName = String(plan.service_name).replace(
                  /['"]/g,
                  ''
                );
                alertMessage = `Manutenção "${sanitizedServiceName}" próxima: faltam ${daysRemaining} dias`;
              }
            }
          }

          // Criar alerta se necessário
          if (shouldAlert) {
            // ✅ SEGURO: INSERT parametrizado
            const insertRequest = pool.request();
            insertRequest.input('organizationId', vehicle.organization_id);
            insertRequest.input('vehicleId', vehicle.id);
            insertRequest.input('planId', plan.id);
            insertRequest.input('alertType', plan.trigger_type);
            insertRequest.input('alertMessage', alertMessage);
            insertRequest.input('currentOdometer', vehicle.odometer || null);
            insertRequest.input('nextServiceOdometer', nextServiceOdometer);
            insertRequest.input('nextServiceDate', nextServiceDate);

            await insertRequest.query(`
              INSERT INTO maintenance_alerts (
                organization_id, vehicle_id, maintenance_plan_id,
                alert_type, alert_message,
                current_odometer, next_service_odometer,
                current_check_date, next_service_date,
                status, created_at
              ) VALUES (
                @organizationId, @vehicleId, @planId,
                @alertType, @alertMessage,
                @currentOdometer, @nextServiceOdometer,
                GETDATE(), @nextServiceDate,
                'ACTIVE', GETDATE()
              )
            `);

            result.alertsCreated++;
            // Sanitizar plate para log
            const sanitizedPlate = String(vehicle.plate).replace(/['"]/g, '');
            logger.info(`⚠️  [CheckMaintenanceAlertsJob] Alerta criado: ${sanitizedPlate} - ${alertMessage}`);
          }
        }
      }

      logger.info(`✅ [CheckMaintenanceAlertsJob] Verificação concluída: ${result.alertsCreated} alertas criados`);

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('❌ [CheckMaintenanceAlertsJob] Erro ao verificar manutenções:', errorMessage);

      result.success = false;
      result.error = errorMessage;
      return result;
    }
  }
}
