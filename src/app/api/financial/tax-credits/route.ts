import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { taxCredits, inboundInvoices } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const credits = await db
      .select({
        id: taxCredits.id,
        invoiceId: taxCredits.invoiceId,
        invoiceKey: inboundInvoices.accessKey,
        taxType: taxCredits.taxType,
        taxValue: taxCredits.taxValue,
        isRecoverable: taxCredits.isRecoverable,
        recoveredInPeriod: taxCredits.recoveredInPeriod,
        createdAt: taxCredits.createdAt,
      })
      .from(taxCredits)
      .leftJoin(inboundInvoices, eq(taxCredits.invoiceId, inboundInvoices.id))
      .where(and(
        eq(taxCredits.organizationId, ctx.organizationId),
        isNull(taxCredits.deletedAt)
      ));

    // KPIs
    const kpis = await db
      .select({
        totalRecoverable: sql<string>`SUM(CASE WHEN ${taxCredits.isRecoverable} = 'S' THEN ${taxCredits.taxValue} ELSE 0 END)`,
        totalIcms: sql<string>`SUM(CASE WHEN ${taxCredits.taxType} = 'ICMS' THEN ${taxCredits.taxValue} ELSE 0 END)`,
        totalPis: sql<string>`SUM(CASE WHEN ${taxCredits.taxType} = 'PIS' THEN ${taxCredits.taxValue} ELSE 0 END)`,
        totalCofins: sql<string>`SUM(CASE WHEN ${taxCredits.taxType} = 'COFINS' THEN ${taxCredits.taxValue} ELSE 0 END)`,
      })
      .from(taxCredits)
      .where(and(
        eq(taxCredits.organizationId, ctx.organizationId),
        isNull(taxCredits.deletedAt)
      ));

    return NextResponse.json({ data: credits, kpis: kpis[0] });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // ⚠️ Segurança: impedir override via spread do body
    // (última chave vence em object literals)
    const {
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    const taxCreditData = {
      ...safeBody,
      organizationId: ctx.organizationId,
      branchId,
      createdBy: ctx.userId,
      version: 1,
    } as unknown as typeof taxCredits.$inferInsert;

    const insertQuery = db
      .insert(taxCredits)
      .values(taxCreditData);

    const createdId = await insertReturning(insertQuery, { id: taxCredits.id }) as Array<Record<string, unknown>>;
    const creditId = createdId[0]?.id;

    const credit = creditId
      ? await queryFirst<typeof taxCredits.$inferSelect>(
          db
            .select()
            .from(taxCredits)
            .where(and(eq(taxCredits.id, Number(creditId)), eq(taxCredits.organizationId, ctx.organizationId)))
            .orderBy(asc(taxCredits.id))
        )
      : null;

    return NextResponse.json({ success: true, data: credit });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});











