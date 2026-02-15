/**
 * API: Download de Remessa CNAB
 * GET /api/financial/remittances/[id]/download
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { bankRemittances } from "@/modules/financial/infrastructure/persistence/schemas";
import { and, eq, isNull } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
export const GET = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;

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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao baixar remessa:", error);
    return NextResponse.json(
      { error: "Falha ao baixar remessa" },
      { status: 500 }
    );
  }
});



































