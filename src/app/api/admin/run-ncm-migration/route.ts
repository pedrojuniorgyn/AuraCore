import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🔧 Criar tabela ncm_financial_categories
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    console.log("🔧 Iniciando migration de NCM Categories...");

    // 1. Criar tabela ncm_financial_categories
    await db.execute(sql`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ncm_financial_categories' AND xtype='U')
      BEGIN
        CREATE TABLE ncm_financial_categories (
          id INT PRIMARY KEY IDENTITY(1,1),
          organization_id INT NOT NULL,
          branch_id INT NULL,
          ncm_code NVARCHAR(8) NOT NULL,
          financial_category_id INT NULL,
          chart_account_id INT NULL,
          description NVARCHAR(255),
          is_active BIT DEFAULT 1,
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          deleted_at DATETIME2 NULL,
          version INT DEFAULT 1
        );
        
        CREATE INDEX idx_ncm_org ON ncm_financial_categories(organization_id, ncm_code);
        CREATE INDEX idx_ncm_active ON ncm_financial_categories(is_active, deleted_at);
      END
    `);
    console.log("✅ Tabela ncm_financial_categories criada");

    // 2. Adicionar colunas em fiscal_document_items (se não existirem)
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT * FROM syscolumns 
        WHERE id=OBJECT_ID('fiscal_document_items') AND name='category_id'
      )
      BEGIN
        ALTER TABLE fiscal_document_items ADD category_id INT NULL;
      END
    `);
    console.log("✅ Coluna category_id adicionada em fiscal_document_items");

    await db.execute(sql`
      IF NOT EXISTS (
        SELECT * FROM syscolumns 
        WHERE id=OBJECT_ID('fiscal_document_items') AND name='chart_account_id'
      )
      BEGIN
        ALTER TABLE fiscal_document_items ADD chart_account_id INT NULL;
      END
    `);
    console.log("✅ Coluna chart_account_id adicionada em fiscal_document_items");

    await db.execute(sql`
      IF NOT EXISTS (
        SELECT * FROM syscolumns 
        WHERE id=OBJECT_ID('fiscal_document_items') AND name='cost_center_id'
      )
      BEGIN
        ALTER TABLE fiscal_document_items ADD cost_center_id INT NULL;
      END
    `);
    console.log("✅ Coluna cost_center_id adicionada em fiscal_document_items");

    return NextResponse.json({
      success: true,
      message: "Migration de NCM concluída com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro na migration:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}







