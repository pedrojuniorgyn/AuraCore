/**
 * HR Journey Processor
 * Processador de jornadas de motoristas - Lei 13.103/2015
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface JourneyData {
  driverId: number;
  vehicleId?: number;
  journeyDate: Date;
  startedAt: Date;
  finishedAt: Date;
  events: JourneyEvent[];
}

export interface JourneyEvent {
  timestamp: Date;
  eventType: 'DRIVING' | 'RESTING' | 'WAITING';
  duration: number;
}

export interface JourneyCalculation {
  totalDrivingHours: number;
  totalRestHours: number;
  totalWaitingHours: number;
  exceededMaxDriving: boolean;
  insufficientRest: boolean;
  regularHours: number;
  overtime50: number;
  overtime100: number;
  nightHours: number;
  waitingHours: number;
  amounts: {
    base: number;
    overtime: number;
    night: number;
    waiting: number;
    total: number;
  };
}

export class HRJourneyProcessor {
  
  private static readonly MAX_DRIVING_HOURS = 5.5;
  private static readonly MIN_REST_HOURS = 11;
  private static readonly DAILY_HOURS = 8;
  
  /**
   * Processar jornada do motorista
   */
  static async processJourney(organizationId: number, journey: JourneyData): Promise<JourneyCalculation> {
    
    // Calcular totais
    let totalDriving = 0;
    let totalRest = 0;
    let totalWaiting = 0;

    for (const event of journey.events) {
      switch (event.eventType) {
        case 'DRIVING':
          totalDriving += event.duration;
          break;
        case 'RESTING':
          totalRest += event.duration;
          break;
        case 'WAITING':
          totalWaiting += event.duration;
          break;
      }
    }

    // Validar limites
    const exceededMaxDriving = totalDriving > this.MAX_DRIVING_HOURS;
    const insufficientRest = totalRest < this.MIN_REST_HOURS;

    // Calcular horas para folha
    const totalWorked = totalDriving + totalWaiting;
    const regularHours = Math.min(totalWorked, this.DAILY_HOURS);
    const extraHours = Math.max(0, totalWorked - this.DAILY_HOURS);
    
    // Simplificado: 50% até 2h, 100% acima
    const overtime50 = Math.min(extraHours, 2);
    const overtime100 = Math.max(0, extraHours - 2);

    // Adicional noturno (simplificado)
    const nightHours = this.calculateNightHours(journey.startedAt, journey.finishedAt);

    // Horas de espera (30% sem encargo - Lei 13.103)
    const waitingHours = totalWaiting;

    // Calcular valores (exemplo com salário base de R$ 3.000)
    const baseSalary = 3000;
    const hourlyRate = baseSalary / 220; // 220h/mês

    const amounts = {
      base: regularHours * hourlyRate,
      overtime: (overtime50 * hourlyRate * 1.5) + (overtime100 * hourlyRate * 2),
      night: nightHours * hourlyRate * 0.2,
      waiting: waitingHours * hourlyRate * 0.3,
      total: 0
    };

    amounts.total = amounts.base + amounts.overtime + amounts.night + amounts.waiting;

    // Salvar no banco
    await db.execute(sql`
      INSERT INTO driver_work_journey 
        (organization_id, driver_id, vehicle_id, journey_date, started_at, finished_at,
         total_driving_hours, total_rest_hours, total_waiting_hours,
         exceeded_max_driving, insufficient_rest,
         regular_hours, overtime_50, overtime_100, night_hours, waiting_hours,
         base_salary_day, overtime_amount, night_amount, waiting_amount, processed)
      VALUES 
        (${organizationId}, ${journey.driverId}, ${journey.vehicleId || null}, 
         ${journey.journeyDate}, ${journey.startedAt}, ${journey.finishedAt},
         ${totalDriving}, ${totalRest}, ${totalWaiting},
         ${exceededMaxDriving ? 1 : 0}, ${insufficientRest ? 1 : 0},
         ${regularHours}, ${overtime50}, ${overtime100}, ${nightHours}, ${waitingHours},
         ${amounts.base}, ${amounts.overtime}, ${amounts.night}, ${amounts.waiting}, 1)
    `);

    return {
      totalDrivingHours: totalDriving,
      totalRestHours: totalRest,
      totalWaitingHours: totalWaiting,
      exceededMaxDriving,
      insufficientRest,
      regularHours,
      overtime50,
      overtime100,
      nightHours,
      waitingHours,
      amounts
    };
  }

  /**
   * Calcular horas noturnas (22h às 5h)
   */
  private static calculateNightHours(start: Date, end: Date): number {
    // Simplificado: retorna estimativa
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const nightStart = 22;
    const nightEnd = 5;
    
    // Estimativa básica: 20% das horas trabalhadas se iniciou antes das 22h ou terminou após 5h
    if (start.getHours() >= nightStart || end.getHours() <= nightEnd) {
      return totalHours * 0.2;
    }
    
    return 0;
  }

  /**
   * Gerar relatório de compliance
   */
  static async generateComplianceReport(
    organizationId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    
    const violations = await db.execute(sql`
      SELECT 
        d.name as driver_name,
        COUNT(*) as violation_count,
        SUM(CASE WHEN exceeded_max_driving = 1 THEN 1 ELSE 0 END) as driving_violations,
        SUM(CASE WHEN insufficient_rest = 1 THEN 1 ELSE 0 END) as rest_violations
      FROM driver_work_journey dwj
      JOIN drivers d ON dwj.driver_id = d.id
      WHERE dwj.organization_id = ${organizationId}
        AND dwj.journey_date BETWEEN ${startDate} AND ${endDate}
        AND (dwj.exceeded_max_driving = 1 OR dwj.insufficient_rest = 1)
      GROUP BY d.name
      ORDER BY violation_count DESC
    `);

    return violations.recordset || violations;
  }
}








