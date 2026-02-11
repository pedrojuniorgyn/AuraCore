import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db, ensureConnection } from "@/lib/db";
import { accountsReceivable, businessPartners, financialCategories, costCenters, chartOfAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";

import { logger } from '@/shared/infrastructure/logging';
// Schemas de validação
const createReceivableSchema = z.object({
  partnerId: z.number().int().positive().optional().nullable(),
  categoryId: z.number().int().positive({ message: "Categoria é obrigatória" }),
  costCenterId: z.number().int().positive().optional().nullable(),
  chartAccountId: z.number().int().positive().optional().nullable(),
  description: z.string().min(1, "Descrição é obrigatória"),
  documentNumber: z.string().optional().nullable(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amount: z.string().or(z.number()).transform((val) => String(val)),
  notes: z.string().optional().nullable(),
});

const queryReceivablesSchema = z.object({
  status: z.string().optional(),
  // ✅ CORRIGIDO: .datetime() valida formato ISO 8601
  startDate: z.string().datetime({ message: 'Data inicial inválida (use formato ISO 8601: YYYY-MM-DDTHH:mm:ssZ)' }).optional(),
  endDate: z.string().datetime({ message: 'Data final inválida (use formato ISO 8601: YYYY-MM-DDTHH:mm:ssZ)' }).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * GET /api/financial/receivables
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validação Zod
    const validation = queryReceivablesSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, startDate, endDate } = validation.data;

    const conditions: SQL<unknown>[] = [
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
    logger.error("❌ Erro ao listar contas a receber:", error);
    return NextResponse.json(
      { error: "Falha ao listar contas", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/financial/receivables
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // Validação Zod
    const validation = createReceivableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const receivableData: typeof accountsReceivable.$inferInsert = {
      id: globalThis.crypto.randomUUID(),
      organizationId: ctx.organizationId,
      // Política: header manda; body não decide filial.
      branchId,
      partnerId: data.partnerId || null,
      categoryId: data.categoryId,
      bankAccountId: null,
      costCenterId: data.costCenterId || null,
      chartAccountId: data.chartAccountId || null,
      description: data.description,
      documentNumber: data.documentNumber || null,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      receiveDate: null,
      amount: data.amount,
      amountReceived: "0",
      discount: "0",
      interest: "0",
      fine: "0",
      status: "OPEN",
      origin: "MANUAL",
      notes: data.notes || null,
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
          eq(accountsReceivable.documentNumber, data.documentNumber || "")
        )
      )
      .orderBy(accountsReceivable.id);

    return NextResponse.json({ data: newReceivable }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar conta a receber:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta", details: errorMessage },
      { status: 500 }
    );
  }
});
