import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboundInvoices, inboundInvoiceItems, businessPartners, products } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/inbound-invoices/[id]
 * Busca uma NFe específica com seus itens.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Busca a NFe com dados do fornecedor
    const [invoice] = await db
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
        xmlContent: inboundInvoices.xmlContent,
        status: inboundInvoices.status,
        importedBy: inboundInvoices.importedBy,
        createdAt: inboundInvoices.createdAt,
        // Dados do parceiro
        partnerId: inboundInvoices.partnerId,
        partnerName: businessPartners.name,
        partnerDocument: businessPartners.document,
        partnerTradeName: businessPartners.tradeName,
      })
      .from(inboundInvoices)
      .leftJoin(
        businessPartners,
        eq(inboundInvoices.partnerId, businessPartners.id)
      )
      .where(
        and(
          eq(inboundInvoices.id, id),
          eq(inboundInvoices.organizationId, ctx.organizationId),
          isNull(inboundInvoices.deletedAt)
        )
      );

    if (!invoice) {
      return NextResponse.json(
        { error: "NFe não encontrada ou você não tem permissão." },
        { status: 404 }
      );
    }

    // Busca os itens da NFe com produtos vinculados
    const items = await db
      .select({
        id: inboundInvoiceItems.id,
        invoiceId: inboundInvoiceItems.invoiceId,
        productId: inboundInvoiceItems.productId,
        productCodeXml: inboundInvoiceItems.productCodeXml,
        productNameXml: inboundInvoiceItems.productNameXml,
        eanXml: inboundInvoiceItems.eanXml,
        ncm: inboundInvoiceItems.ncm,
        cfop: inboundInvoiceItems.cfop,
        cst: inboundInvoiceItems.cst,
        quantity: inboundInvoiceItems.quantity,
        unit: inboundInvoiceItems.unit,
        unitPrice: inboundInvoiceItems.unitPrice,
        totalPrice: inboundInvoiceItems.totalPrice,
        itemNumber: inboundInvoiceItems.itemNumber,
        createdAt: inboundInvoiceItems.createdAt,
        // Dados do produto vinculado (se houver)
        productSku: products.sku,
        productName: products.name,
      })
      .from(inboundInvoiceItems)
      .leftJoin(
        products,
        eq(inboundInvoiceItems.productId, products.id)
      )
      .where(eq(inboundInvoiceItems.invoiceId, id))
      .orderBy(inboundInvoiceItems.itemNumber);

    return NextResponse.json({
      invoice,
      items,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Falha ao buscar NFe.", details: error.message },
      { status: 500 }
    );
  }
}



