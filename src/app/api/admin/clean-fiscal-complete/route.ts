import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 🧹 LIMPEZA COMPLETA DAS TABELAS FISCAIS
 * 
 * Limpa TODAS as tabelas fiscais (antigas + novas) para começar do zero
 */
export async function POST() {
  try {
    console.log("🧹 Iniciando limpeza completa das tabelas fiscais...");

    // 1. Limpar nova estrutura (Fiscal → Contábil → Financeiro)
    console.log("📋 Limpando nova estrutura...");
    
    await db.execute(sql`DELETE FROM financial_transactions`);
    console.log("  ✅ financial_transactions limpa");
    
    await db.execute(sql`DELETE FROM journal_entry_lines`);
    console.log("  ✅ journal_entry_lines limpa");
    
    await db.execute(sql`DELETE FROM journal_entries`);
    console.log("  ✅ journal_entries limpa");
    
    await db.execute(sql`DELETE FROM fiscal_document_items`);
    console.log("  ✅ fiscal_document_items limpa");
    
    await db.execute(sql`DELETE FROM fiscal_documents`);
    console.log("  ✅ fiscal_documents limpa");

    // 2. Limpar estrutura antiga
    console.log("📋 Limpando estrutura antiga...");
    
    // Limpar cargo_documents primeiro (tem FK para inbound_invoices)
    await db.execute(sql`DELETE FROM cargo_documents`);
    console.log("  ✅ cargo_documents limpa");
    
    await db.execute(sql`DELETE FROM inbound_invoice_items`);
    console.log("  ✅ inbound_invoice_items limpa");
    
    await db.execute(sql`DELETE FROM inbound_invoices`);
    console.log("  ✅ inbound_invoices limpa");
    
    await db.execute(sql`DELETE FROM external_ctes`);
    console.log("  ✅ external_ctes limpa");

    // 3. Limpar FKs em contas a pagar/receber
    console.log("📋 Limpando FKs...");
    
    await db.execute(sql`
      UPDATE accounts_payable 
      SET fiscal_document_id = NULL, 
          journal_entry_id = NULL 
      WHERE fiscal_document_id IS NOT NULL
    `);
    console.log("  ✅ accounts_payable FKs limpas");
    
    await db.execute(sql`
      UPDATE accounts_receivable 
      SET fiscal_document_id = NULL, 
          journal_entry_id = NULL 
      WHERE fiscal_document_id IS NOT NULL
    `);
    console.log("  ✅ accounts_receivable FKs limpas");

    // 4. Resetar identities
    console.log("🔢 Resetando identities...");
    
    await db.execute(sql`DBCC CHECKIDENT ('fiscal_documents', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('fiscal_document_items', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('journal_entries', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('journal_entry_lines', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('financial_transactions', RESEED, 0)`);
    console.log("  ✅ Identities resetadas");

    console.log("✅ Limpeza completa concluída!");

    return NextResponse.json({
      success: true,
      message: "Todas as tabelas fiscais foram limpas com sucesso",
      cleaned: {
        newStructure: [
          "fiscal_documents",
          "fiscal_document_items",
          "journal_entries",
          "journal_entry_lines",
          "financial_transactions"
        ],
        oldStructure: [
          "inbound_invoices (SEFAZ_ROBOT)",
          "inbound_invoice_items",
          "external_ctes"
        ],
        fks: [
          "accounts_payable.fiscal_document_id",
          "accounts_payable.journal_entry_id",
          "accounts_receivable.fiscal_document_id",
          "accounts_receivable.journal_entry_id"
        ]
      }
    });

  } catch (error: unknown) {
    console.error("❌ Erro na limpeza:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

