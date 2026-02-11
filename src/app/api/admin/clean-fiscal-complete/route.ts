import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🧹 LIMPEZA COMPLETA DAS TABELAS FISCAIS
 * 
 * Limpa TODAS as tabelas fiscais (antigas + novas) para começar do zero
 */
export const POST = withDI(async () => {
  try {
    logger.info("🧹 Iniciando limpeza completa das tabelas fiscais...");

    // 1. Limpar nova estrutura (Fiscal → Contábil → Financeiro)
    logger.info("📋 Limpando nova estrutura...");
    
    await db.execute(sql`DELETE FROM financial_transactions`);
    logger.info("  ✅ financial_transactions limpa");
    
    await db.execute(sql`DELETE FROM journal_entry_lines`);
    logger.info("  ✅ journal_entry_lines limpa");
    
    await db.execute(sql`DELETE FROM journal_entries`);
    logger.info("  ✅ journal_entries limpa");
    
    await db.execute(sql`DELETE FROM fiscal_document_items`);
    logger.info("  ✅ fiscal_document_items limpa");
    
    await db.execute(sql`DELETE FROM fiscal_documents`);
    logger.info("  ✅ fiscal_documents limpa");

    // 2. Limpar estrutura antiga
    logger.info("📋 Limpando estrutura antiga...");
    
    // Limpar cargo_documents primeiro (tem FK para inbound_invoices)
    await db.execute(sql`DELETE FROM cargo_documents`);
    logger.info("  ✅ cargo_documents limpa");
    
    await db.execute(sql`DELETE FROM inbound_invoice_items`);
    logger.info("  ✅ inbound_invoice_items limpa");
    
    await db.execute(sql`DELETE FROM inbound_invoices`);
    logger.info("  ✅ inbound_invoices limpa");
    
    await db.execute(sql`DELETE FROM external_ctes`);
    logger.info("  ✅ external_ctes limpa");

    // 3. Limpar FKs em contas a pagar/receber
    logger.info("📋 Limpando FKs...");
    
    await db.execute(sql`
      UPDATE accounts_payable 
      SET fiscal_document_id = NULL, 
          journal_entry_id = NULL 
      WHERE fiscal_document_id IS NOT NULL
    `);
    logger.info("  ✅ accounts_payable FKs limpas");
    
    await db.execute(sql`
      UPDATE accounts_receivable 
      SET fiscal_document_id = NULL, 
          journal_entry_id = NULL 
      WHERE fiscal_document_id IS NOT NULL
    `);
    logger.info("  ✅ accounts_receivable FKs limpas");

    // 4. Resetar identities
    logger.info("🔢 Resetando identities...");
    
    await db.execute(sql`DBCC CHECKIDENT ('fiscal_documents', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('fiscal_document_items', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('journal_entries', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('journal_entry_lines', RESEED, 0)`);
    await db.execute(sql`DBCC CHECKIDENT ('financial_transactions', RESEED, 0)`);
    logger.info("  ✅ Identities resetadas");

    logger.info("✅ Limpeza completa concluída!");

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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro na limpeza:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        stack: (error instanceof Error ? error.stack : undefined) 
      },
      { status: 500 }
    );
  }
});

