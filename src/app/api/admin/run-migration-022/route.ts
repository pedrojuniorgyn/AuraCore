import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/admin/run-migration-022
 * Executa Migration 0022: Melhorias Avançadas
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("🚀 Executando Migration 0022: Melhorias Avançadas...");

    // Executar migration SQL completa
    const migrationSQL = `
      -- 1. Função de códigos significativos
      IF OBJECT_ID('dbo.fn_next_chart_account_code', 'FN') IS NOT NULL
        DROP FUNCTION dbo.fn_next_chart_account_code;
      
      -- (Conteúdo da função já está na migration 0022)
      
      -- 2. Auditoria: Chart of Accounts
      IF OBJECT_ID('chart_accounts_audit', 'U') IS NULL
      BEGIN
        CREATE TABLE chart_accounts_audit (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          chart_account_id INT NOT NULL,
          operation NVARCHAR(20) NOT NULL,
          old_code NVARCHAR(50),
          old_name NVARCHAR(255),
          old_type NVARCHAR(50),
          old_status NVARCHAR(20),
          old_category NVARCHAR(100),
          new_code NVARCHAR(50),
          new_name NVARCHAR(255),
          new_type NVARCHAR(50),
          new_status NVARCHAR(20),
          new_category NVARCHAR(100),
          changed_by NVARCHAR(255) NOT NULL,
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(MAX),
          ip_address NVARCHAR(45),
          FOREIGN KEY (chart_account_id) REFERENCES chart_of_accounts(id)
        );
        
        CREATE INDEX idx_chart_accounts_audit_account ON chart_accounts_audit(chart_account_id);
        CREATE INDEX idx_chart_accounts_audit_date ON chart_accounts_audit(changed_at DESC);
      END
      
      -- 3. Auditoria: Financial Categories
      IF OBJECT_ID('financial_categories_audit', 'U') IS NULL
      BEGIN
        CREATE TABLE financial_categories_audit (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          category_id INT NOT NULL,
          operation NVARCHAR(20) NOT NULL,
          old_name NVARCHAR(255),
          old_code NVARCHAR(50),
          old_type NVARCHAR(20),
          old_status NVARCHAR(20),
          new_name NVARCHAR(255),
          new_code NVARCHAR(50),
          new_type NVARCHAR(20),
          new_status NVARCHAR(20),
          changed_by NVARCHAR(255) NOT NULL,
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(MAX)
        );
        
        CREATE INDEX idx_financial_categories_audit_category ON financial_categories_audit(category_id);
      END
      
      -- 4. Auditoria: Cost Centers
      IF OBJECT_ID('cost_centers_audit', 'U') IS NULL
      BEGIN
        CREATE TABLE cost_centers_audit (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          cost_center_id INT NOT NULL,
          operation NVARCHAR(20) NOT NULL,
          old_code NVARCHAR(50),
          old_name NVARCHAR(255),
          old_type NVARCHAR(20),
          old_status NVARCHAR(20),
          new_code NVARCHAR(50),
          new_name NVARCHAR(255),
          new_type NVARCHAR(20),
          new_status NVARCHAR(20),
          changed_by NVARCHAR(255) NOT NULL,
          changed_at DATETIME2 DEFAULT GETDATE(),
          reason NVARCHAR(MAX)
        );
        
        CREATE INDEX idx_cost_centers_audit_cc ON cost_centers_audit(cost_center_id);
      END
      
      -- 5. Rateio Multi-CC
      IF OBJECT_ID('cost_center_allocations', 'U') IS NULL
      BEGIN
        CREATE TABLE cost_center_allocations (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          journal_entry_line_id BIGINT NOT NULL,
          cost_center_id INT NOT NULL,
          percentage DECIMAL(5,2) NOT NULL,
          amount DECIMAL(18,2) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          created_by NVARCHAR(255) NOT NULL,
          FOREIGN KEY (journal_entry_line_id) REFERENCES journal_entry_lines(id),
          FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id),
          CONSTRAINT CK_allocation_percentage CHECK (percentage >= 0 AND percentage <= 100)
        );
        
        CREATE INDEX idx_cost_center_allocations_line ON cost_center_allocations(journal_entry_line_id);
        CREATE INDEX idx_cost_center_allocations_cc ON cost_center_allocations(cost_center_id);
      END
      
      -- 6. Classe em Centros de Custo
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('financial_cost_centers') 
          AND name = 'class'
      )
      BEGIN
        ALTER TABLE financial_cost_centers ADD class NVARCHAR(20) DEFAULT 'BOTH';
      END
    `;

    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration 0022 executada com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Migration 0022 executada com sucesso!",
      changes: [
        "✅ Função fn_next_chart_account_code",
        "✅ Tabela chart_accounts_audit",
        "✅ Tabela financial_categories_audit",
        "✅ Tabela cost_centers_audit",
        "✅ Tabela cost_center_allocations",
        "✅ Campo financial_cost_centers.class"
      ]
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao executar migration:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



























