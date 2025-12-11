/**
 * API: Listar Remessas
 * GET /api/financial/remittances
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankRemittances, bankAccounts } from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
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
    console.error("❌ Erro ao listar remessas:", error);
    return NextResponse.json(
      { error: "Falha ao listar remessas" },
      { status: 500 }
    );
  }
}












