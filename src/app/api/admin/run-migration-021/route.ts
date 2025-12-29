import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/admin/run-migration-021
 * Executa Migration 0021: Integração Centros de Custo
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("🚀 Executando Migration 0021: Integração Centros de Custo...");

    // 1. Adicionar cost_center_id em journal_entry_lines
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('journal_entry_lines') 
          AND name = 'cost_center_id'
      )
      BEGIN
        ALTER TABLE journal_entry_lines ADD cost_center_id INT NULL;
        PRINT '✅ Coluna cost_center_id adicionada em journal_entry_lines';
      END
    `);

    // 2. FK journal_entry_lines
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_journal_entry_lines_cost_center'
      )
      BEGIN
        ALTER TABLE journal_entry_lines
        ADD CONSTRAINT FK_journal_entry_lines_cost_center
        FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id);
        PRINT '✅ FK cost_center_id adicionada em journal_entry_lines';
      END
    `);

    // 3. Índice journal_entry_lines
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'idx_journal_entry_lines_cost_center'
      )
      BEGIN
        CREATE INDEX idx_journal_entry_lines_cost_center 
        ON journal_entry_lines(cost_center_id);
        PRINT '✅ Índice idx_journal_entry_lines_cost_center criado';
      END
    `);

    // 4. Adicionar cost_center_id em fiscal_document_items
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('fiscal_document_items') 
          AND name = 'cost_center_id'
      )
      BEGIN
        ALTER TABLE fiscal_document_items ADD cost_center_id INT NULL;
        PRINT '✅ Coluna cost_center_id adicionada em fiscal_document_items';
      END
    `);

    // 5. FK fiscal_document_items
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_fiscal_document_items_cost_center'
      )
      BEGIN
        ALTER TABLE fiscal_document_items
        ADD CONSTRAINT FK_fiscal_document_items_cost_center
        FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id);
        PRINT '✅ FK cost_center_id adicionada em fiscal_document_items';
      END
    `);

    // 6. Índice fiscal_document_items
    await db.execute(sql`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'idx_fiscal_document_items_cost_center'
      )
      BEGIN
        CREATE INDEX idx_fiscal_document_items_cost_center 
        ON fiscal_document_items(cost_center_id);
        PRINT '✅ Índice idx_fiscal_document_items_cost_center criado';
      END
    `);

    console.log("✅ Migration 0021 executada com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Migration 0021 executada com sucesso!",
      changes: [
        "✅ journal_entry_lines.cost_center_id",
        "✅ fiscal_document_items.cost_center_id",
        "✅ Foreign Keys criadas",
        "✅ Índices de performance criados"
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

























