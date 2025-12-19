import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 🔧 ATUALIZAR NSU DA FILIAL
 * 
 * Quando SEFAZ retorna erro 656, use o ultNSU retornado
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const { branchId, newNsu } = body;

    if (!branchId || !newNsu) {
      return NextResponse.json(
        { error: "branchId e newNsu são obrigatórios" },
        { status: 400 }
      );
    }

    console.log(`🔧 Atualizando NSU da filial ${branchId} para: ${newNsu}`);

    await db
      .update(branches)
      .set({
        lastNsu: newNsu,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, branchId));

    console.log("✅ NSU atualizado com sucesso!");

    return NextResponse.json({
      success: true,
      message: `NSU atualizado para ${newNsu}`,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


















