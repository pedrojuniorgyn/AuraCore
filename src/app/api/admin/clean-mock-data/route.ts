import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * API de Limpeza de Dados Mock - AuraCore
 * 
 * ATENÇÃO: Esta API só deve ser executada em ambiente de DESENVOLVIMENTO!
 * Remove dados fictícios inseridos via seed para permitir testes com dados reais.
 * 
 * @endpoint POST /api/admin/clean-mock-data
 * @body { organizationId?: number, dryRun?: boolean }
 */

interface CleanResult {
  table: string;
  rowsDeleted: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Verificar se é ambiente de desenvolvimento
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { 
        success: false, 
        error: "Esta operação não é permitida em ambiente de produção",
        code: "FORBIDDEN_IN_PRODUCTION"
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const organizationId = body.organizationId ?? 1;
    const dryRun = body.dryRun ?? false;

    // Lista de tabelas para limpar (ordem importa por causa de FKs)
    const tablesToClean = [
      // WMS
      { name: "wms_billing_items", fkDependency: null },
      { name: "wms_billing_events", fkDependency: null },
      { name: "wms_pre_invoices", fkDependency: null },
      
      // Fiscal
      { name: "tax_matrix", fkDependency: null },
      { name: "fiscal_validation_log", fkDependency: null },
      { name: "tax_credits", fkDependency: null },
      
      // CIAP (ordem importa - monthly_appropriation depende de ciap_control)
      { name: "ciap_monthly_appropriation", fkDependency: "ciap_control" },
      { name: "ciap_control", fkDependency: null },
      
      // RH
      { name: "driver_work_journey", fkDependency: null },
      
      // Sinistros
      { name: "claim_documents", fkDependency: "claims_management" },
      { name: "claims_management", fkDependency: null },
      
      // ESG
      { name: "carbon_emissions", fkDependency: null },
      
      // Intercompany
      { name: "intercompany_allocation_results", fkDependency: "intercompany_allocations" },
      { name: "intercompany_allocations", fkDependency: null },
      { name: "cost_allocation_targets", fkDependency: null },
      { name: "cost_allocation_rules", fkDependency: null },
    ];

    const results: CleanResult[] = [];
    let totalRowsDeleted = 0;

    for (const table of tablesToClean) {
      try {
        // Verificar se tabela existe
        const checkTableQuery = `
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = '${table.name}'
        `;
        const tableCheck = await pool.query(checkTableQuery);
        const tableData = (tableCheck.recordset || tableCheck) as Array<{ count: number }>;
        const tableExists = tableData[0]?.count > 0;

        if (!tableExists) {
          results.push({
            table: table.name,
            rowsDeleted: 0,
            success: true,
            error: "Tabela não existe"
          });
          continue;
        }

        // Construir query de delete
        let deleteQuery: string;
        
        if (table.fkDependency) {
          // Tabela com FK - precisa de JOIN
          deleteQuery = `
            DELETE t FROM ${table.name} t
            INNER JOIN ${table.fkDependency} p ON t.${table.fkDependency.replace("_management", "")}_id = p.id
            WHERE p.organization_id = ${organizationId}
          `;
        } else {
          deleteQuery = `DELETE FROM ${table.name} WHERE organization_id = ${organizationId}`;
        }

        if (dryRun) {
          // Apenas contar sem deletar
          const countQuery = table.fkDependency
            ? `SELECT COUNT(*) as count FROM ${table.name} t INNER JOIN ${table.fkDependency} p ON t.${table.fkDependency.replace("_management", "")}_id = p.id WHERE p.organization_id = ${organizationId}`
            : `SELECT COUNT(*) as count FROM ${table.name} WHERE organization_id = ${organizationId}`;
          
          const countResult = await pool.query(countQuery);
          const countData = (countResult.recordset || countResult) as Array<{ count: number }>;
          const count = countData[0]?.count ?? 0;
          
          results.push({
            table: table.name,
            rowsDeleted: count,
            success: true,
            error: "(dry run - não deletado)"
          });
          totalRowsDeleted += count;
        } else {
          // Executar delete
          const deleteResult = await pool.query(deleteQuery);
          const rowsAffected = deleteResult.rowsAffected?.[0] ?? 0;
          
          results.push({
            table: table.name,
            rowsDeleted: rowsAffected,
            success: true
          });
          totalRowsDeleted += rowsAffected;
        }
      } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          table: table.name,
          rowsDeleted: 0,
          success: false,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? "🔍 Simulação concluída (dry run - nenhum dado foi deletado)"
        : "✅ Limpeza de dados mock concluída com sucesso!",
      organizationId,
      dryRun,
      totalRowsDeleted,
      results,
      nextSteps: [
        "1. Recarregar as páginas do dashboard",
        "2. Verificar se os KPIs mostram valores zerados",
        "3. Inserir dados reais via interfaces do sistema"
      ]
    });

  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: "CLEAN_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * GET para verificar status e contagem de registros mock
 */
export async function GET() {
  // Verificar se é ambiente de desenvolvimento
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { 
        success: false, 
        error: "Esta operação não é permitida em ambiente de produção",
        code: "FORBIDDEN_IN_PRODUCTION"
      },
      { status: 403 }
    );
  }

  try {
    const organizationId = 1;
    
    const tables = [
      "tax_matrix",
      "tax_credits",
      "ciap_control",
      "driver_work_journey",
      "claims_management",
      "carbon_emissions",
      "intercompany_allocations",
      "cost_allocation_rules",
      "wms_billing_events",
      "wms_pre_invoices"
    ];

    const counts: Record<string, number> = {};
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const query = `SELECT COUNT(*) as count FROM ${table} WHERE organization_id = ${organizationId}`;
        const result = await pool.query(query);
        const data = (result.recordset || result) as Array<{ count: number }>;
        const count = data[0]?.count ?? 0;
        counts[table] = count;
        totalRecords += count;
      } catch {
        counts[table] = -1; // Tabela não existe
      }
    }

    return NextResponse.json({
      success: true,
      message: "Status dos dados mock",
      organizationId,
      totalRecords,
      counts,
      canClean: totalRecords > 0
    });

  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
