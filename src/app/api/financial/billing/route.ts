import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingInvoices, billingItems, cteHeader, businessPartners } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";
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
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const body = await request.json();

    const { customerId, periodStart, periodEnd, billingFrequency } = body;
    if (!customerId || !periodStart || !periodEnd || !billingFrequency) {
      return NextResponse.json(
        { error: "Campos obrigatórios: customerId, periodStart, periodEnd, billingFrequency" },
        { status: 400 }
      );
    }
    const startDt = new Date(periodStart);
    const endDt = new Date(periodEnd);
    if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) {
      return NextResponse.json({ error: "periodStart/periodEnd inválidos" }, { status: 400 });
    }

    // Buscar CTes do período
    const ctes = await db
      .select()
      .from(cteHeader)
      .where(
        and(
          eq(cteHeader.organizationId, ctx.organizationId),
          eq(cteHeader.branchId, branchId),
          eq(cteHeader.takerId, customerId),
          eq(cteHeader.status, "AUTHORIZED"),
          between(cteHeader.issueDate, startDt, endDt),
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

    const created = await withMssqlTransaction(async (tx) => {
      const yearMonth = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const tmpNumber = `FAT-${yearMonth}-TMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const insertRes = await tx
        .request()
        .input("orgId", sql.Int, ctx.organizationId)
        .input("branchId", sql.Int, branchId)
        .input("invoiceNumber", sql.NVarChar(50), tmpNumber)
        .input("customerId", sql.Int, Number(customerId))
        .input("periodStart", sql.DateTime2, startDt)
        .input("periodEnd", sql.DateTime2, endDt)
        .input("billingFrequency", sql.NVarChar(20), String(billingFrequency))
        .input("totalCtes", sql.Int, ctes.length)
        .input("grossValue", sql.Decimal(18, 2), grossValue)
        .input("netValue", sql.Decimal(18, 2), netValue)
        .input("issueDate", sql.DateTime2, new Date())
        .input("dueDate", sql.DateTime2, dueDate)
        .input("createdBy", sql.NVarChar(255), ctx.userId)
        .input("updatedBy", sql.NVarChar(255), ctx.userId)
        .query(
          `
          INSERT INTO billing_invoices (
            organization_id, branch_id,
            invoice_number,
            customer_id,
            period_start, period_end,
            billing_frequency,
            total_ctes,
            gross_value, net_value,
            issue_date, due_date,
            status,
            created_at, updated_at, deleted_at,
            created_by, updated_by, version
          )
          OUTPUT INSERTED.id
          VALUES (
            @orgId, @branchId,
            @invoiceNumber,
            @customerId,
            @periodStart, @periodEnd,
            @billingFrequency,
            @totalCtes,
            @grossValue, @netValue,
            @issueDate, @dueDate,
            'DRAFT',
            GETDATE(), GETDATE(), NULL,
            @createdBy, @updatedBy, 1
          )
        `
        );

      const invoiceId = insertRes.recordset?.[0]?.id as number | undefined;
      if (!invoiceId) throw new Error("Falha ao criar billing_invoice");

      const finalNumber = `FAT-${yearMonth}-${String(invoiceId).padStart(6, "0")}`;
      await tx
        .request()
        .input("orgId", sql.Int, ctx.organizationId)
        .input("invoiceId", sql.Int, invoiceId)
        .input("finalNumber", sql.NVarChar(50), finalNumber)
        .input("updatedBy", sql.NVarChar(255), ctx.userId)
        .query(
          `
          UPDATE billing_invoices
          SET invoice_number = @finalNumber, updated_at = GETDATE(), updated_by = @updatedBy
          WHERE id = @invoiceId AND organization_id = @orgId
        `
        );

      for (const cte of ctes) {
        await tx
          .request()
          .input("invoiceId", sql.Int, invoiceId)
          .input("cteId", sql.Int, Number(cte.id))
          .input("cteNumber", sql.Int, Number(cte.cteNumber))
          .input("cteSeries", sql.NVarChar(3), cte.serie ? String(cte.serie) : null)
          .input("cteKey", sql.NVarChar(44), cte.cteKey ? String(cte.cteKey) : null)
          .input("cteIssueDate", sql.DateTime2, new Date(cte.issueDate))
          .input("cteValue", sql.Decimal(18, 2), Number(cte.totalValue ?? 0))
          .input("originUf", sql.NVarChar(2), cte.originUf ? String(cte.originUf) : null)
          .input("destinationUf", sql.NVarChar(2), cte.destinationUf ? String(cte.destinationUf) : null)
          .query(
            `
            INSERT INTO billing_items (
              billing_invoice_id,
              cte_id,
              cte_number, cte_series, cte_key,
              cte_issue_date, cte_value,
              origin_uf, destination_uf,
              created_at
            )
            VALUES (
              @invoiceId,
              @cteId,
              @cteNumber, @cteSeries, @cteKey,
              @cteIssueDate, @cteValue,
              @originUf, @destinationUf,
              GETDATE()
            )
          `
          );
      }

      return { id: invoiceId, invoiceNumber: finalNumber };
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}















