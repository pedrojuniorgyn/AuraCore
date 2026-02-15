/**
 * API: Listar Remessas
 * GET /api/financial/remittances
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { bankRemittances, bankAccounts } from "@/modules/financial/infrastructure/persistence/schemas";
import { and, eq, isNull, desc } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
export const GET = withDI(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = Number(searchParams.get("organizationId") || "1");

    // === BUSCAR REMESSAS ===
    const remittances = await db
      .select({
        id: bankRemittances.id,
        fileName: bankRemittances.fileName,
        remittanceNumber: bankRemittances.remittanceNumber,
        type: bankRemittances.type,
        status: bankRemittances.status,
        totalRecords: bankRemittances.totalRecords,
        totalAmount: bankRemittances.totalAmount,
        createdAt: bankRemittances.createdAt,
        processedAt: bankRemittances.processedAt,
        notes: bankRemittances.notes,
        bankAccount: {
          id: bankAccounts.id,
          name: bankAccounts.name,
          bankName: bankAccounts.bankName,
        },
      })
      .from(bankRemittances)
      .leftJoin(
        bankAccounts,
        eq(bankRemittances.bankAccountId, bankAccounts.id)
      )
      .where(
        and(
          eq(bankRemittances.organizationId, organizationId),
          isNull(bankRemittances.deletedAt)
        )
      )
      .orderBy(desc(bankRemittances.createdAt));

    return NextResponse.json({ data: remittances });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar remessas:", error);
    return NextResponse.json(
      { error: "Falha ao listar remessas" },
      { status: 500 }
    );
  }
});



































