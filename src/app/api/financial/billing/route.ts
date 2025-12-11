import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingInvoices, billingItems, cteHeader, businessPartners } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, between, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const invoices = await db
      .select({
        id: billingInvoices.id,
        invoiceNumber: billingInvoices.invoiceNumber,
        customerId: billingInvoices.customerId,
        customerName: businessPartners.name,
        periodStart: billingInvoices.periodStart,
        periodEnd: billingInvoices.periodEnd,
        totalCtes: billingInvoices.totalCtes,
        netValue: billingInvoices.netValue,
        dueDate: billingInvoices.dueDate,
        status: billingInvoices.status,
        createdAt: billingInvoices.createdAt,
      })
      .from(billingInvoices)
      .leftJoin(businessPartners, eq(billingInvoices.customerId, businessPartners.id))
      .where(
        and(
          eq(billingInvoices.organizationId, ctx.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .orderBy(desc(billingInvoices.createdAt));

    return NextResponse.json({ data: invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    const { customerId, periodStart, periodEnd, billingFrequency } = body;

    // Buscar CTes do período
    const ctes = await db
      .select()
      .from(cteHeader)
      .where(
        and(
          eq(cteHeader.takerId, customerId),
          eq(cteHeader.status, "AUTHORIZED"),
          between(cteHeader.issueDate, new Date(periodStart), new Date(periodEnd)),
          isNull(cteHeader.deletedAt)
        )
      );

    if (ctes.length === 0) {
      return NextResponse.json(
        { error: "Nenhum CTe encontrado no período" },
        { status: 400 }
      );
    }

    const grossValue = ctes.reduce((acc, cte) => acc + parseFloat(cte.totalValue || "0"), 0);
    const netValue = grossValue;

    const [invoice] = await db
      .insert(billingInvoices)
      .values({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        invoiceNumber: await generateBillingNumber(ctx.branchId),
        customerId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        billingFrequency,
        totalCtes: ctes.length,
        grossValue: grossValue.toString(),
        netValue: netValue.toString(),
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "DRAFT",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        version: 1,
      })
      .returning();

    // Inserir itens
    for (const cte of ctes) {
      await db.insert(billingItems).values({
        billingInvoiceId: invoice.id,
        cteId: cte.id,
        cteNumber: cte.cteNumber,
        cteSeries: cte.serie,
        cteKey: cte.cteKey,
        cteIssueDate: cte.issueDate,
        cteValue: cte.totalValue,
        originUf: cte.originUf,
        destinationUf: cte.destinationUf,
      });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateBillingNumber(branchId: number): Promise<string> {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  return `FAT-${year}${month}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}










