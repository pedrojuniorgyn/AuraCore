import { pool, ensureConnection } from "@/lib/db";

/**
 * Cron Job: Verificar Planos de Manutenção Vencidos
 * Executa diariamente para criar alertas de manutenção
 */
export async function checkMaintenanceAlerts() {
  try {
    console.log("🔧 [CRON] Verificando planos de manutenção...");

    await ensureConnection();

    // Buscar todos os veículos ativos
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
    console.log(`📊 Encontrados ${vehicles.length} veículos ativos`);

    let alertsCreated = 0;

    // Para cada veículo, verificar planos aplicáveis
    for (const vehicle of vehicles) {
      // Buscar planos de manutenção (específicos do modelo ou genéricos)
      const plansResult = await pool.request().query(`
        SELECT * FROM vehicle_maintenance_plans
        WHERE organization_id = ${vehicle.organization_id}
        AND is_active = 'S'
        AND (vehicle_model = '${vehicle.model}' OR vehicle_model IS NULL)
      `);

      const plans = plansResult.recordset;

      for (const plan of plans) {
        let shouldAlert = false;
        let alertMessage = "";
        let nextServiceOdometer = null;
        let nextServiceDate = null;

        // Verificar se já existe alerta ativo
        const existingAlertResult = await pool.request().query(`
          SELECT * FROM maintenance_alerts
          WHERE vehicle_id = ${vehicle.id}
          AND maintenance_plan_id = ${plan.id}
          AND status = 'ACTIVE'
        `);

        if (existingAlertResult.recordset.length > 0) {
          continue; // Já existe alerta ativo
        }

        // Verificar trigger por KM
        if (plan.trigger_type === "MILEAGE" || plan.trigger_type === "BOTH") {
          if (plan.mileage_interval && vehicle.odometer) {
            // Buscar última manutenção deste tipo
            const lastServiceResult = await pool.request().query(`
              SELECT TOP 1 odometer
              FROM maintenance_work_orders
              WHERE vehicle_id = ${vehicle.id}
              AND wo_type = 'PREVENTIVE'
              AND status = 'COMPLETED'
              ORDER BY completed_at DESC
            `);

            const lastServiceOdometer =
              lastServiceResult.recordset.length > 0
                ? lastServiceResult.recordset[0].odometer
                : 0;

            const kmSinceLastService = vehicle.odometer - lastServiceOdometer;
            nextServiceOdometer = lastServiceOdometer + plan.mileage_interval;
            const kmRemaining = nextServiceOdometer - vehicle.odometer;

            if (kmRemaining <= (plan.advance_warning_km || 0)) {
              shouldAlert = true;
              alertMessage = `Manutenção "${plan.service_name}" próxima: faltam ${kmRemaining} km`;
            }
          }
        }

        // Verificar trigger por tempo
        if (plan.trigger_type === "TIME" || plan.trigger_type === "BOTH") {
          if (plan.time_interval_months) {
            // Buscar última manutenção deste tipo
            const lastServiceResult = await pool.request().query(`
              SELECT TOP 1 completed_at
              FROM maintenance_work_orders
              WHERE vehicle_id = ${vehicle.id}
              AND wo_type = 'PREVENTIVE'
              AND status = 'COMPLETED'
              ORDER BY completed_at DESC
            `);

            const lastServiceDate =
              lastServiceResult.recordset.length > 0
                ? new Date(lastServiceResult.recordset[0].completed_at)
                : new Date(Date.now() - plan.time_interval_months * 30 * 24 * 60 * 60 * 1000);

            const nextServiceDateCalc = new Date(lastServiceDate);
            nextServiceDateCalc.setMonth(
              nextServiceDateCalc.getMonth() + plan.time_interval_months
            );

            nextServiceDate = nextServiceDateCalc.toISOString();

            const daysRemaining = Math.floor(
              (nextServiceDateCalc.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            if (daysRemaining <= (plan.advance_warning_days || 0)) {
              shouldAlert = true;
              alertMessage = `Manutenção "${plan.service_name}" próxima: faltam ${daysRemaining} dias`;
            }
          }
        }

        // Criar alerta se necessário
        if (shouldAlert) {
          await pool.request().query(`
            INSERT INTO maintenance_alerts (
              organization_id, vehicle_id, maintenance_plan_id,
              alert_type, alert_message,
              current_odometer, next_service_odometer,
              current_check_date, next_service_date,
              status, created_at
            ) VALUES (
              ${vehicle.organization_id}, ${vehicle.id}, ${plan.id},
              '${plan.trigger_type}', '${alertMessage}',
              ${vehicle.odometer || "NULL"}, ${nextServiceOdometer || "NULL"},
              GETDATE(), ${nextServiceDate ? `'${nextServiceDate}'` : "NULL"},
              'ACTIVE', GETDATE()
            )
          `);

          alertsCreated++;
          console.log(
            `⚠️  Alerta criado: ${vehicle.plate} - ${alertMessage}`
          );
        }
      }
    }

    console.log(
      `✅ [CRON] Verificação concluída: ${alertsCreated} alertas criados`
    );

    return {
      success: true,
      vehiclesChecked: vehicles.length,
      alertsCreated,
    };
  } catch (error) {
    console.error("❌ [CRON] Erro ao verificar manutenções:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Executar cron job (chamado pelo agendador)
 */
export async function runMaintenanceAlertsJob() {
  console.log("🕐 [CRON] Iniciando verificação de manutenções preventivas...");
  const result = await checkMaintenanceAlerts();
  console.log("🕐 [CRON] Resultado:", result);
  return result;
}


























