import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsReceivable, businessPartners, financialCategories, costCenters, chartOfAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

/**
 * GET /api/financial/receivables
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof isNull>> = [
      eq(accountsReceivable.organizationId, ctx.organizationId),
      isNull(accountsReceivable.deletedAt),
    ];

    if (status) {
      conditions.push(eq(accountsReceivable.status, status));
    }

    if (startDate) {
      conditions.push(gte(accountsReceivable.dueDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(accountsReceivable.dueDate, new Date(endDate)));
    }

    const receivables = await db
      .select({
        id: accountsReceivable.id,
        partnerId: accountsReceivable.partnerId,
        partnerName: businessPartners.name,
        categoryId: accountsReceivable.categoryId,
        categoryName: financialCategories.name,
        costCenterId: accountsReceivable.costCenterId,
        costCenterCode: costCenters.code,
        costCenterName: costCenters.name,
        chartAccountId: accountsReceivable.chartAccountId,
        chartAccountCode: chartOfAccounts.code,
        chartAccountName: chartOfAccounts.name,
        description: accountsReceivable.description,
        documentNumber: accountsReceivable.documentNumber,
        issueDate: accountsReceivable.issueDate,
        dueDate: accountsReceivable.dueDate,
        receiveDate: accountsReceivable.receiveDate,
        amount: accountsReceivable.amount,
        amountReceived: accountsReceivable.amountReceived,
        status: accountsReceivable.status,
        origin: accountsReceivable.origin,
        notes: accountsReceivable.notes,
        createdAt: accountsReceivable.createdAt,
        version: accountsReceivable.version,
      })
      .from(accountsReceivable)
      .leftJoin(businessPartners, eq(accountsReceivable.partnerId, businessPartners.id))
      .leftJoin(financialCategories, eq(accountsReceivable.categoryId, financialCategories.id))
      .leftJoin(costCenters, eq(accountsReceivable.costCenterId, costCenters.id))
      .leftJoin(chartOfAccounts, eq(accountsReceivable.chartAccountId, chartOfAccounts.id))
      .where(and(...conditions))
      .orderBy(accountsReceivable.dueDate);

    return NextResponse.json({ data: receivables, total: receivables.length });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar contas a receber:", error);
    return NextResponse.json(
      { error: "Falha ao listar contas", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/receivables
 */
export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const receivableData: typeof accountsReceivable.$inferInsert = {
      organizationId: ctx.organizationId,
      // Política: header manda; body não decide filial.
      branchId,
      partnerId: body.partnerId || null,
      categoryId: body.categoryId,
      bankAccountId: null,
      costCenterId: body.costCenterId || null,
      chartAccountId: body.chartAccountId || null,
      description: body.description,
      documentNumber: body.documentNumber || null,
      issueDate: new Date(body.issueDate),
      dueDate: new Date(body.dueDate),
      receiveDate: null,
      amount: body.amount,
      amountReceived: "0",
      discount: "0",
      interest: "0",
      fine: "0",
      status: "OPEN",
      origin: "MANUAL",
      notes: body.notes || null,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    };

    await db.insert(accountsReceivable).values(receivableData);

    const [newReceivable] = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.organizationId, ctx.organizationId),
          eq(accountsReceivable.documentNumber, body.documentNumber || "")
        )
      )
      .orderBy(accountsReceivable.id);

    return NextResponse.json({ data: newReceivable }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar conta a receber:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta", details: errorMessage },
      { status: 500 }
    );
  }
}
