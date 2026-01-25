import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsPayable, businessPartners, financialCategories, bankAccounts, costCenters, chartOfAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull, gte, lte, sql, type SQL } from "drizzle-orm";
import { ensureFinancialData } from "@/lib/services/financial-init";
import { z } from "zod";

// Schemas de validação
const createPayableSchema = z.object({
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

const queryPayablesSchema = z.object({
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

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
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validação Zod
    const validation = queryPayablesSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, startDate, endDate } = validation.data;

    // Construir condições dinâmicas
    const conditions: SQL<unknown>[] = [
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

    const payables = await db
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
      .where(and(...conditions))
      .orderBy(accountsPayable.dueDate);

    return NextResponse.json({ data: payables, total: payables.length });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar contas a pagar:", error);
    return NextResponse.json(
      { error: "Falha ao listar contas a pagar", details: errorMessage },
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

    // Validação Zod
    const validation = createPayableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const payableData: typeof accountsPayable.$inferInsert = {
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
      payDate: null,
      amount: data.amount,
      amountPaid: "0",
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

    await db.insert(accountsPayable).values(payableData);

    // Busca o registro criado
    const [newPayable] = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.documentNumber, data.documentNumber || "")
        )
      )
      .orderBy(accountsPayable.id);

    return NextResponse.json({ data: newPayable }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar conta a pagar:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta a pagar", details: errorMessage },
      { status: 500 }
    );
  }
}
