/**
 * API: Listar DDA Inbox
 * GET /api/financial/dda
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialDdaInbox, accountsPayable, bankAccounts } from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = Number(searchParams.get("organizationId") || "1");
    const status = searchParams.get("status"); // Optional filter

    // === BUSCAR DDA INBOX ===
    const conditions = [
      eq(financialDdaInbox.organizationId, organizationId),
      isNull(financialDdaInbox.deletedAt),
    ];

    if (status) {
      conditions.push(eq(financialDdaInbox.status, status));
    }

    const ddaItems = await db
      .select({
        id: financialDdaInbox.id,
        externalId: financialDdaInbox.externalId,
        beneficiaryName: financialDdaInbox.beneficiaryName,
        beneficiaryDocument: financialDdaInbox.beneficiaryDocument,
        amount: financialDdaInbox.amount,
        dueDate: financialDdaInbox.dueDate,
        issueDate: financialDdaInbox.issueDate,
        barcode: financialDdaInbox.barcode,
        digitableLine: financialDdaInbox.digitableLine,
        status: financialDdaInbox.status,
        matchScore: financialDdaInbox.matchScore,
        notes: financialDdaInbox.notes,
        createdAt: financialDdaInbox.createdAt,
        matchedPayable: {
          id: accountsPayable.id,
          description: accountsPayable.description,
          documentNumber: accountsPayable.documentNumber,
        },
        bankAccount: {
          id: bankAccounts.id,
          name: bankAccounts.name,
          bankName: bankAccounts.bankName,
        },
      })
      .from(financialDdaInbox)
      .leftJoin(
        accountsPayable,
        eq(financialDdaInbox.matchedPayableId, accountsPayable.id)
      )
      .leftJoin(
        bankAccounts,
        eq(financialDdaInbox.bankAccountId, bankAccounts.id)
      )
      .where(and(...conditions))
      .orderBy(desc(financialDdaInbox.createdAt));

    return NextResponse.json({ data: ddaItems });
  } catch (error) {
    console.error("❌ Erro ao listar DDA:", error);
    return NextResponse.json(
      { error: "Falha ao listar DDA" },
      { status: 500 }
    );
  }
}











