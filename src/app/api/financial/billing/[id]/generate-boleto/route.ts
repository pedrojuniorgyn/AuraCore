import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices, businessPartners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { boletoGenerator } from "@/services/financial/boleto-generator";

/**
 * POST /api/financial/billing/:id/generate-boleto
 * 🔐 Requer permissão: financial.billing.create
 * 
 * Gera boleto para fatura
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "financial.billing.create", async (user, ctx) => {
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
    const resolvedParams = await params;
      // Buscar fatura + cliente
      const [billing] = await db
        .select({
          invoice: billingInvoices,
          customer: businessPartners,
        })
        .from(billingInvoices)
        .leftJoin(businessPartners, eq(billingInvoices.customerId, businessPartners.id))
        .where(eq(billingInvoices.id, billingId));

      if (!billing) {
        return NextResponse.json(
          { error: "Fatura não encontrada" },
          { status: 404 }
        );
      }

      if (billing.invoice.barcodeNumber) {
        return NextResponse.json(
          { error: "Boleto já foi gerado para esta fatura" },
          { status: 400 }
        );
      }

      // Gerar boleto
      console.log("💰 Gerando boleto...");
      const resultado = await boletoGenerator.gerarBoleto({
        customerId: billing.invoice.customerId,
        customerName: billing.customer?.name || "Cliente",
        customerCnpj: billing.customer?.document || "",
        dueDate: billing.invoice.dueDate,
        value: parseFloat(billing.invoice.netValue),
        invoiceNumber: billing.invoice.invoiceNumber,
        description: `Fatura ${billing.invoice.invoiceNumber} - Período ${new Date(billing.invoice.periodStart).toLocaleDateString()} a ${new Date(billing.invoice.periodEnd).toLocaleDateString()}`,
      });

      if (!resultado.success) {
        return NextResponse.json(
          { error: "Falha ao gerar boleto", details: resultado.error },
          { status: 500 }
        );
      }

      // Atualizar fatura
      await db
        .update(billingInvoices)
        .set({
          barcodeNumber: resultado.barcodeNumber,
          pixKey: resultado.pixKey,
          updatedAt: new Date(),
        })
        .where(eq(billingInvoices.id, billingId));

      console.log("✅ Boleto gerado com sucesso!");

      return NextResponse.json({
        success: true,
        message: "Boleto gerado com sucesso!",
        data: {
          barcodeNumber: resultado.barcodeNumber,
          linhaDigitavel: resultado.linhaDigitavel,
          pixKey: resultado.pixKey,
          pdfUrl: resultado.pdfUrl,
        },
      });
    } catch (error: any) {
      console.error("❌ Erro ao gerar boleto:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}



















