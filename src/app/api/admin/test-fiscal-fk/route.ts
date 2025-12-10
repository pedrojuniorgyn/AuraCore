import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🧪 Testar se coluna fiscal_document_id existe
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // Testar query simples
    const result = await db.execute(sql`
      SELECT TOP 1 
        id,
        fiscal_document_id
      FROM accounts_payable
    `);

    return NextResponse.json({
      success: true,
      message: "Coluna existe e está acessível",
      sample: result,
    });
  } catch (error: any) {
    console.error("❌ Erro ao testar coluna:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}




