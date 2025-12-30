/**
 * API: Download de Remessa CNAB
 * GET /api/financial/remittances/[id]/download
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankRemittances } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // === BUSCAR REMESSA ===
    const [remittance] = await db
      .select()
      .from(bankRemittances)
      .where(
        and(
          eq(bankRemittances.id, Number(id)),
          isNull(bankRemittances.deletedAt)
        )
      );

    if (!remittance) {
      return NextResponse.json(
        { error: "Remessa não encontrada" },
        { status: 404 }
      );
    }

    // === RETORNAR ARQUIVO ===
    return new NextResponse(remittance.content, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${remittance.fileName}"`,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao baixar remessa:", error);
    return NextResponse.json(
      { error: "Falha ao baixar remessa" },
      { status: 500 }
    );
  }
}






























