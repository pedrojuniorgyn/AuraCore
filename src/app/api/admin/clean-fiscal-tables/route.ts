import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🗑️ LIMPAR TABELAS FISCAIS E CONTÁBEIS
 * 
 * ⚠️ CUIDADO: Esta operação é IRREVERSÍVEL!
 * 
 * Limpa:
 * - fiscal_documents
 * - fiscal_document_items
 * - journal_entries
 * - journal_entry_lines
 * - financial_transactions
 */
export async function GET() {
  try {
    console.log("\n🗑️ Iniciando limpeza de tabelas fiscais...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // 1️⃣ Limpar financial_transactions
    console.log("1️⃣ Limpando financial_transactions...");
    await db.execute(rawSql`DELETE FROM financial_transactions`);
    console.log("   ✅ Deletado");

    // 2️⃣ Limpar journal_entry_lines
    console.log("2️⃣ Limpando journal_entry_lines...");
    await db.execute(rawSql`DELETE FROM journal_entry_lines`);
    console.log("   ✅ Deletado");

    // 3️⃣ Limpar journal_entries
    console.log("3️⃣ Limpando journal_entries...");
    await db.execute(rawSql`DELETE FROM journal_entries`);
    console.log("   ✅ Deletado");

    // 4️⃣ Limpar fiscal_document_items
    console.log("4️⃣ Limpando fiscal_document_items...");
    await db.execute(rawSql`DELETE FROM fiscal_document_items`);
    console.log("   ✅ Deletado");

    // 5️⃣ Limpar fiscal_documents
    console.log("5️⃣ Limpando fiscal_documents...");
    await db.execute(rawSql`DELETE FROM fiscal_documents`);
    console.log("   ✅ Deletado");

    // 6️⃣ Limpar FKs de accounts_payable e accounts_receivable
    console.log("6️⃣ Limpando FKs em accounts_payable e accounts_receivable...");
    await db.execute(rawSql`
      UPDATE accounts_payable 
      SET fiscal_document_id = NULL, journal_entry_id = NULL
      WHERE fiscal_document_id IS NOT NULL OR journal_entry_id IS NOT NULL
    `);
    
    await db.execute(rawSql`
      UPDATE accounts_receivable 
      SET fiscal_document_id = NULL, journal_entry_id = NULL
      WHERE fiscal_document_id IS NOT NULL OR journal_entry_id IS NOT NULL
    `);
    console.log("   ✅ FKs limpas");

    // 7️⃣ Resetar IDENTITY (Auto-increment)
    console.log("7️⃣ Resetando IDENTITY...");
    await db.execute(rawSql`DBCC CHECKIDENT ('fiscal_documents', RESEED, 0)`);
    await db.execute(rawSql`DBCC CHECKIDENT ('fiscal_document_items', RESEED, 0)`);
    await db.execute(rawSql`DBCC CHECKIDENT ('journal_entries', RESEED, 0)`);
    await db.execute(rawSql`DBCC CHECKIDENT ('journal_entry_lines', RESEED, 0)`);
    await db.execute(rawSql`DBCC CHECKIDENT ('financial_transactions', RESEED, 0)`);
    console.log("   ✅ IDENTITY resetados");

    console.log("\n✅ Limpeza concluída com sucesso!\n");

    return NextResponse.json({
      success: true,
      message: "Todas as tabelas fiscais foram limpas com sucesso",
      tables: [
        "fiscal_documents",
        "fiscal_document_items",
        "journal_entries",
        "journal_entry_lines",
        "financial_transactions",
      ],
    });
  } catch (error: any) {
    console.error("❌ Erro ao limpar tabelas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

