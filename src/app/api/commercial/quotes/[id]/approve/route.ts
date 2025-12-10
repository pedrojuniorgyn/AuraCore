import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { freightQuotes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createPickupOrderFromQuote } from "@/services/tms/workflow-automator";

/**
 * POST /api/commercial/quotes/:id/approve
 * Aprova cotação e cria automaticamente Ordem de Coleta
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const approvedBy = session.user.email || "system";
    const id = parseInt(resolvedParams.id);

    const body = await req.json();
    const { quotedPrice, discountPercent, discountReason } = body;

    // Buscar cotação
    const [quote] = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      );

    if (!quote) {
      return NextResponse.json(
        { error: "Cotação não encontrada" },
        { status: 404 }
      );
    }

    if (quote.status !== "NEW" && quote.status !== "QUOTED") {
      return NextResponse.json(
        { error: `Cotação no status ${quote.status} não pode ser aprovada` },
        { status: 400 }
      );
    }

    // Atualizar cotação para ACCEPTED
    await db
      .update(freightQuotes)
      .set({
        status: "ACCEPTED",
        quotedPrice: quotedPrice?.toString() || quote.calculatedPrice,
        discountPercent: discountPercent?.toString(),
        discountReason,
        approvedBy,
        approvedAt: new Date(),
        updatedBy: approvedBy,
        updatedAt: new Date(),
        version: quote.version + 1,
      })
      .where(eq(freightQuotes.id, id));

    // Criar Ordem de Coleta automaticamente
    try {
    const resolvedParams = await params;
      const pickupOrder = await createPickupOrderFromQuote(id, approvedBy);

      return NextResponse.json({
        success: true,
        message: "Cotação aprovada e Ordem de Coleta criada!",
        data: {
          quoteId: id,
          pickupOrderId: pickupOrder.id,
          pickupOrderNumber: pickupOrder.orderNumber,
        },
      });
    } catch (workflowError: any) {
      console.error("❌ Erro ao criar ordem de coleta:", workflowError);
      
      // Reverter aprovação
      await db
        .update(freightQuotes)
        .set({
          status: "NEW",
          approvedBy: null,
          approvedAt: null,
        })
        .where(eq(freightQuotes.id, id));

      return NextResponse.json(
        {
          error: "Erro ao criar ordem de coleta",
          details: workflowError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Erro ao aprovar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao aprovar cotação", details: error.message },
      { status: 500 }
    );
  }
}







