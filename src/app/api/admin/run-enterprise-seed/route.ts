import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const seedPath = join(process.cwd(), "drizzle/seeds/enterprise_seed_data.sql");
    const seedSQL = readFileSync(seedPath, "utf-8");
    
    await pool.query(seedSQL);

    return NextResponse.json({
      success: true,
      message: "🎉 SEED DE DADOS ENTERPRISE EXECUTADO COM SUCESSO!",
      data_seeded: {
        fiscal_tax_matrix: "15 rotas principais",
        wms_billing_events: "8 eventos pendentes",
        driver_work_journey: "5 jornadas com alertas",
        claims_management: "5 sinistros",
        ciap_control: "5 ativos",
        carbon_emissions: "8 emissões CO2",
        intercompany_allocations: "5 rateios históricos",
        cost_center_approvers: "5 aprovadores",
        driver_performance_config: "4 métricas de bonificação",
        cost_allocation_rules: "3 regras de rateio"
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}




















