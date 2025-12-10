/**
 * ESG Carbon Calculator
 * Calculadora de emissões de CO2 para transporte rodoviário
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface EmissionInput {
  documentId: number;
  documentType: 'CTE' | 'TRIP';
  customerId: number;
  customerName: string;
  vehicleId?: number;
  fuelConsumedLiters: number;
  distanceKm: number;
  cargoWeightKg?: number;
}

export interface EmissionResult {
  fuelEfficiency: number;
  emissionFactor: number;
  co2EmissionKg: number;
  co2EmissionTons: number;
  estimatedCost?: number;
}

export class ESGCarbonCalculator {
  
  // Fatores de emissão (kg CO2 / litro de diesel)
  private static readonly EMISSION_FACTOR_DIESEL = 2.60; // IPCC 2023
  private static readonly CARBON_CREDIT_PRICE_PER_TON = 150.00; // R$/ton
  
  /**
   * Calcular emissões de uma viagem/CT-e
   */
  static async calculateEmission(
    organizationId: number, 
    input: EmissionInput
  ): Promise<EmissionResult> {
    
    // 1. Calcular eficiência
    const fuelEfficiency = input.distanceKm / input.fuelConsumedLiters;
    
    // 2. Calcular CO2
    const co2EmissionKg = input.fuelConsumedLiters * this.EMISSION_FACTOR_DIESEL;
    const co2EmissionTons = co2EmissionKg / 1000;
    
    // 3. Custo estimado de compensação
    const estimatedCost = co2EmissionTons * this.CARBON_CREDIT_PRICE_PER_TON;
    
    // 4. Salvar no banco
    await db.execute(sql`
      INSERT INTO carbon_emissions 
        (organization_id, document_type, document_id, customer_id, customer_name,
         vehicle_id, fuel_consumed_liters, distance_km,
         fuel_efficiency, emission_factor, co2_emission_kg, co2_emission_tons,
         emission_date, offset_status)
      VALUES 
        (${organizationId}, ${input.documentType}, ${input.documentId}, 
         ${input.customerId}, ${input.customerName}, ${input.vehicleId || null},
         ${input.fuelConsumedLiters}, ${input.distanceKm},
         ${fuelEfficiency}, ${this.EMISSION_FACTOR_DIESEL}, ${co2EmissionKg}, ${co2EmissionTons},
         GETDATE(), 'NONE')
    `);
    
    return {
      fuelEfficiency,
      emissionFactor: this.EMISSION_FACTOR_DIESEL,
      co2EmissionKg,
      co2EmissionTons,
      estimatedCost
    };
  }
  
  /**
   * Calcular emissões em lote para múltiplos CT-es
   */
  static async batchCalculate(
    organizationId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    
    // Buscar CT-es sem cálculo de emissão
    const ctes = await db.execute(sql`
      SELECT 
        cte.id as document_id,
        cte.customer_id,
        c.name as customer_name,
        cte.total_distance_km as distance_km,
        0 as fuel_consumed_liters
      FROM fiscal_documents cte
      LEFT JOIN customers c ON cte.customer_id = c.id
      LEFT JOIN carbon_emissions ce ON ce.document_id = cte.id AND ce.document_type = 'CTE'
      WHERE cte.organization_id = ${organizationId}
        AND cte.document_type = 'CTE'
        AND cte.issue_date BETWEEN ${startDate} AND ${endDate}
        AND ce.id IS NULL
    `);
    
    const cteList = ctes.recordset || ctes;
    let totalProcessed = 0;
    
    for (const cte of cteList) {
      // Estimar consumo baseado em média de 2.5 km/l
      const estimatedFuel = cte.distance_km / 2.5;
      
      await this.calculateEmission(organizationId, {
        documentId: cte.document_id,
        documentType: 'CTE',
        customerId: cte.customer_id,
        customerName: cte.customer_name,
        fuelConsumedLiters: estimatedFuel,
        distanceKm: cte.distance_km
      });
      
      totalProcessed++;
    }
    
    return {
      processed: totalProcessed,
      message: `${totalProcessed} CT-es processados para cálculo de carbono`
    };
  }
  
  /**
   * Gerar relatório consolidado por cliente
   */
  static async getCustomerReport(
    organizationId: number, 
    customerId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    
    const summary = await db.execute(sql`
      SELECT 
        customer_name,
        COUNT(*) as total_trips,
        SUM(fuel_consumed_liters) as total_fuel,
        SUM(distance_km) as total_distance,
        AVG(fuel_efficiency) as avg_efficiency,
        SUM(co2_emission_kg) as total_co2_kg,
        SUM(co2_emission_tons) as total_co2_tons
      FROM carbon_emissions
      WHERE organization_id = ${organizationId}
        AND customer_id = ${customerId}
        AND emission_date BETWEEN ${startDate} AND ${endDate}
      GROUP BY customer_name
    `);
    
    return summary.recordset?.[0] || summary[0] || {};
  }
  
  /**
   * Registrar compensação de carbono
   */
  static async registerOffset(
    organizationId: number, 
    emissionIds: number[], 
    offsetProjectName: string,
    certificateUrl?: string
  ): Promise<void> {
    
    for (const emissionId of emissionIds) {
      await db.execute(sql`
        UPDATE carbon_emissions 
        SET offset_status = 'COMPENSATED',
            offset_project_name = ${offsetProjectName},
            offset_date = GETDATE(),
            offset_certificate_url = ${certificateUrl || null}
        WHERE id = ${emissionId}
      `);
    }
  }
  
  /**
   * Gerar dashboard ESG consolidado
   */
  static async getDashboard(organizationId: number, year: number): Promise<any> {
    
    const dashboard = await db.execute(sql`
      SELECT 
        COUNT(*) as total_trips,
        SUM(fuel_consumed_liters) as total_fuel,
        SUM(distance_km) as total_distance,
        SUM(co2_emission_tons) as total_co2_tons,
        SUM(CASE WHEN offset_status = 'COMPENSATED' THEN co2_emission_tons ELSE 0 END) as compensated_tons
      FROM carbon_emissions
      WHERE organization_id = ${organizationId}
        AND YEAR(emission_date) = ${year}
    `);
    
    const data = dashboard.recordset?.[0] || dashboard[0] || {};
    
    const compensationRate = data.total_co2_tons > 0 
      ? (data.compensated_tons / data.total_co2_tons) * 100 
      : 0;
    
    return {
      ...data,
      compensationRate
    };
  }
}

