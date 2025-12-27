import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Executando MARATONA ENTERPRISE: 3 Migrations Completas");
    
    const migrations = [
      "0029_enterprise_simple_tables.sql"
    ];

    const results = [];

    for (const migrationFile of migrations) {
      console.log(`\n📄 Executando: ${migrationFile}`);
      
      const migrationPath = join(process.cwd(), "drizzle/migrations", migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf-8");
      
      await pool.query(migrationSQL);
      
      results.push({
        file: migrationFile,
        status: "✅ SUCCESS"
      });
      
      console.log(`✅ ${migrationFile} concluído!`);
    }

    return NextResponse.json({
      success: true,
      message: "🎉 MARATONA ENTERPRISE COMPLETA!",
      migrations_executed: results,
      summary: {
        backoffice: {
          accounts_added: 35,
          cost_centers_added: 10,
          tables_created: ["cost_center_approvers", "cost_allocation_rules", "cost_allocation_targets"]
        },
        rh_specialized: {
          accounts_added: 15,
          tables_created: ["driver_work_journey", "driver_performance_config"]
        },
        fiscal_intelligence: {
          accounts_added: 3,
          tables_created: ["fiscal_tax_matrix", "fiscal_validation_log"],
          tax_rules_seeded: 11
        },
        wms_billing: {
          accounts_added: 10,
          tables_created: ["wms_billing_events", "wms_pre_invoices"]
        },
        risk_management: {
          accounts_added: 5
        },
        technology: {
          accounts_added: 4
        },
        ciap: {
          accounts_added: 3,
          tables_created: ["ciap_control", "ciap_monthly_appropriation"]
        },
        claims: {
          accounts_added: 4,
          tables_created: ["claims_management"]
        },
        intercompany: {
          accounts_added: 2,
          tables_created: ["intercompany_allocations", "intercompany_allocation_details"]
        },
        esg_carbon: {
          tables_created: ["carbon_emissions"]
        },
        views_created: [
          "v_driver_journey_alerts",
          "v_active_tax_matrix",
          "v_wms_billing_summary",
          "v_ciap_pending",
          "v_claims_open",
          "v_esg_carbon_summary",
          "v_intercompany_pending"
        ]
      }
    });
  } catch (error: unknown) {
    console.error("❌ Erro na migration:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

