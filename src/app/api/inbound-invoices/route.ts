import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboundInvoices, businessPartners } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * GET /api/inbound-invoices
 * Lista NFes de entrada da organização.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 */
export async function GET(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);

    // Paginação
    const _start = parseInt(searchParams.get("_start") || "0");
    const _end = parseInt(searchParams.get("_end") || "10");

    // Query com JOIN para pegar nome do fornecedor
    const invoices = await db
      .select({
        id: inboundInvoices.id,
        accessKey: inboundInvoices.accessKey,
        series: inboundInvoices.series,
        number: inboundInvoices.number,
        model: inboundInvoices.model,
        issueDate: inboundInvoices.issueDate,
        entryDate: inboundInvoices.entryDate,
        totalProducts: inboundInvoices.totalProducts,
        totalNfe: inboundInvoices.totalNfe,
        status: inboundInvoices.status,
        importedBy: inboundInvoices.importedBy,
        createdAt: inboundInvoices.createdAt,
        // Dados do parceiro
        partnerId: inboundInvoices.partnerId,
        partnerName: businessPartners.name,
        partnerDocument: businessPartners.document,
      })
      .from(inboundInvoices)
      .leftJoin(
        businessPartners,
        eq(inboundInvoices.partnerId, businessPartners.id)
      )
      .where(
        and(
          eq(inboundInvoices.organizationId, ctx.organizationId),
          isNull(inboundInvoices.deletedAt)
        )
      )
      .orderBy(desc(inboundInvoices.createdAt));

    const total = invoices.length;
    const paginatedInvoices = invoices.slice(_start, _end);

    return NextResponse.json(
      {
        data: paginatedInvoices,
        total,
      },
      {
        headers: {
          "Access-Control-Expose-Headers": "X-Total-Count",
          "X-Total-Count": total.toString(),
        },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Falha ao buscar NFes.", details: error.message },
      { status: 500 }
    );
  }
}




