import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsPayable, businessPartners, financialCategories, bankAccounts, costCenters, chartOfAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import { ensureFinancialData } from "@/lib/services/financial-init";

/**
 * GET /api/financial/payables
 * 
 * Lista contas a pagar com filtros
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    
    // Garante que categorias e contas existem
    await ensureFinancialData(ctx.organizationId, ctx.userId);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = db
      .select({
        id: accountsPayable.id,
        partnerId: accountsPayable.partnerId,
        partnerName: businessPartners.name,
        categoryId: accountsPayable.categoryId,
        categoryName: financialCategories.name,
        costCenterId: accountsPayable.costCenterId,
        costCenterCode: costCenters.code,
        costCenterName: costCenters.name,
        chartAccountId: accountsPayable.chartAccountId,
        chartAccountCode: chartOfAccounts.code,
        chartAccountName: chartOfAccounts.name,
        description: accountsPayable.description,
        documentNumber: accountsPayable.documentNumber,
        issueDate: accountsPayable.issueDate,
        dueDate: accountsPayable.dueDate,
        payDate: accountsPayable.payDate,
        amount: accountsPayable.amount,
        amountPaid: accountsPayable.amountPaid,
        status: accountsPayable.status,
        origin: accountsPayable.origin,
        notes: accountsPayable.notes,
        createdAt: accountsPayable.createdAt,
        version: accountsPayable.version,
      })
      .from(accountsPayable)
      .leftJoin(businessPartners, eq(accountsPayable.partnerId, businessPartners.id))
      .leftJoin(financialCategories, eq(accountsPayable.categoryId, financialCategories.id))
      .leftJoin(costCenters, eq(accountsPayable.costCenterId, costCenters.id))
      .leftJoin(chartOfAccounts, eq(accountsPayable.chartAccountId, chartOfAccounts.id))
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      );

    // Filtros opcionais
    const conditions: any[] = [
      eq(accountsPayable.organizationId, ctx.organizationId),
      isNull(accountsPayable.deletedAt),
    ];

    if (status) {
      conditions.push(eq(accountsPayable.status, status));
    }

    if (startDate) {
      conditions.push(gte(accountsPayable.dueDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(accountsPayable.dueDate, new Date(endDate)));
    }

    const payables = await query.where(and(...conditions)).orderBy(accountsPayable.dueDate);

    return NextResponse.json({ data: payables, total: payables.length });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar contas a pagar:", error);
    return NextResponse.json(
      { error: "Falha ao listar contas a pagar", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/payables
 * 
 * Cria nova conta a pagar
 */
export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    await db.insert(accountsPayable).values({
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
      payDate: null,
      amount: body.amount,
      amountPaid: 0,
      discount: 0,
      interest: 0,
      fine: 0,
      status: "OPEN",
      origin: "MANUAL",
      notes: body.notes || null,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });

    // Busca o registro criado
    const [newPayable] = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.documentNumber, body.documentNumber || "")
        )
      )
      .orderBy(accountsPayable.id);

    return NextResponse.json({ data: newPayable }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar conta a pagar:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}

