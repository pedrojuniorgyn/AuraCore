import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🔧 Adiciona coluna fiscal_document_id em accounts_payable e accounts_receivable
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    console.log("🔧 Iniciando adição de colunas fiscal_document_id...");

    // 1. Adicionar coluna em accounts_payable
    try {
      await db.execute(sql`
        ALTER TABLE accounts_payable
        ADD fiscal_document_id BIGINT NULL
      `);
      console.log("✅ Coluna fiscal_document_id adicionada em accounts_payable");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already an object")) {
        console.log("⚠️ Coluna fiscal_document_id já existe em accounts_payable");
      } else {
        throw error;
      }
    }

    // 2. Adicionar coluna em accounts_receivable
    try {
      await db.execute(sql`
        ALTER TABLE accounts_receivable
        ADD fiscal_document_id BIGINT NULL
      `);
      console.log("✅ Coluna fiscal_document_id adicionada em accounts_receivable");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already an object")) {
        console.log("⚠️ Coluna fiscal_document_id já existe em accounts_receivable");
      } else {
        throw error;
      }
    }

    // 3. Adicionar Foreign Keys (opcional, mas recomendado)
    try {
      await db.execute(sql`
        ALTER TABLE accounts_payable
        ADD CONSTRAINT FK_accounts_payable_fiscal_document
        FOREIGN KEY (fiscal_document_id) REFERENCES fiscal_documents(id)
      `);
      console.log("✅ FK adicionada em accounts_payable");
    } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already an object")) {
        console.log("⚠️ FK já existe em accounts_payable");
      } else {
        console.log("⚠️ Não foi possível adicionar FK em accounts_payable:", errorMessage);
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE accounts_receivable
        ADD CONSTRAINT FK_accounts_receivable_fiscal_document
        FOREIGN KEY (fiscal_document_id) REFERENCES fiscal_documents(id)
      `);
      console.log("✅ FK adicionada em accounts_receivable");
    } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already an object")) {
        console.log("⚠️ FK já existe em accounts_receivable");
      } else {
        console.log("⚠️ Não foi possível adicionar FK em accounts_receivable:", errorMessage);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Colunas fiscal_document_id adicionadas com sucesso",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao adicionar colunas:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}





















