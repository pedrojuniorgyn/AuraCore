import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";
import { ensureConnection } from "@/lib/db";

/**
 * PUT /api/branches/[id]/set-nsu
 * 
 * Define manualmente o NSU de uma filial
 * 
 * Body: { nsu: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { nsu } = body;

    if (!nsu || typeof nsu !== "string") {
      return NextResponse.json(
        { error: "NSU inválido. Deve ser uma string de 15 dígitos." },
        { status: 400 }
      );
    }

    // Valida se o NSU tem 15 dígitos
    const cleanNsu = nsu.replace(/\D/g, "").padStart(15, "0");

    // Atualiza o NSU
    await db
      .update(branches)
      .set({
        lastNsu: cleanNsu,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId),
          isNull(branches.deletedAt)
        )
      );

    console.log(`✅ NSU atualizado para: ${cleanNsu}`);

    return NextResponse.json(
      { message: "NSU atualizado com sucesso!", nsu: cleanNsu },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao atualizar NSU:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar NSU.", details: error.message },
      { status: 500 }
    );
  }
}






















