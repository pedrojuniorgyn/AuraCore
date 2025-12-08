import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { inboundInvoiceItems, products } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/inbound-invoices/[id]/items
 * 
 * Retorna os itens de uma NFe específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const invoiceId = parseInt(params.id);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: "ID da nota inválido" },
        { status: 400 }
      );
    }

    // Busca os itens com join opcional para produtos vinculados
    const items = await db
      .select({
        id: inboundInvoiceItems.id,
        invoiceId: inboundInvoiceItems.invoiceId,
        productId: inboundInvoiceItems.productId,
        productCodeXml: inboundInvoiceItems.productCodeXml,
        productNameXml: inboundInvoiceItems.productNameXml,
        ncm: inboundInvoiceItems.ncm,
        cfop: inboundInvoiceItems.cfop,
        quantity: inboundInvoiceItems.quantity,
        unitPrice: inboundInvoiceItems.unitPrice,
        totalPrice: inboundInvoiceItems.totalPrice,
        // Join opcional com produtos
        productName: products.name,
      })
      .from(inboundInvoiceItems)
      .leftJoin(
        products,
        and(
          eq(inboundInvoiceItems.productId, products.id),
          isNull(products.deletedAt)
        )
      )
      .where(eq(inboundInvoiceItems.invoiceId, invoiceId))
      .orderBy(inboundInvoiceItems.id);

    return NextResponse.json({
      data: items,
      total: items.length,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar itens da NFe:", error);
    return NextResponse.json(
      { error: "Erro ao buscar itens da NFe" },
      { status: 500 }
    );
  }
}


