/**
 * POST /api/financial/billing/:id/generate-boleto
 * 🔐 Requer permissão: financial.billing.create
 * 
 * Gera boleto para fatura
 * 
 * @since E9 Fase 2 - Migrado para IBoletoGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices, businessPartners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { FINANCIAL_TOKENS } from "@/modules/financial/infrastructure/di/FinancialModule";
import type { IBoletoGateway } from "@/modules/financial/domain/ports/output/IBoletoGateway";
import { Result } from "@/shared/domain";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "financial.billing.create", async (user, ctx) => {
    const resolvedParams = await params;
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
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

      // Resolver gateway via DI
      const boletoGateway = container.resolve<IBoletoGateway>(
        FINANCIAL_TOKENS.BoletoGateway
      );

      // Gerar boleto via Gateway
      console.log("💰 Gerando boleto...");
      const resultado = await boletoGateway.generate({
        customerId: billing.invoice.customerId,
        customerName: billing.customer?.name || "Cliente",
        customerCnpj: billing.customer?.document || "",
        dueDate: billing.invoice.dueDate,
        value: parseFloat(billing.invoice.netValue),
        invoiceNumber: billing.invoice.invoiceNumber,
        description: `Fatura ${billing.invoice.invoiceNumber} - Período ${new Date(billing.invoice.periodStart).toLocaleDateString()} a ${new Date(billing.invoice.periodEnd).toLocaleDateString()}`,
      });

      if (Result.isFail(resultado)) {
        return NextResponse.json(
          { error: "Falha ao gerar boleto", details: resultado.error },
          { status: 500 }
        );
      }

      const boletoData = resultado.value;

      // Atualizar fatura
      await db
        .update(billingInvoices)
        .set({
          barcodeNumber: boletoData.barcode,
          pixKey: boletoData.pixKey,
          updatedAt: new Date(),
        })
        .where(eq(billingInvoices.id, billingId));

      console.log("✅ Boleto gerado com sucesso!");

      return NextResponse.json({
        success: true,
        message: "Boleto gerado com sucesso!",
        data: {
          barcodeNumber: boletoData.barcode,
          linhaDigitavel: boletoData.digitableLine,
          pixKey: boletoData.pixKey,
          pdfUrl: boletoData.pdfUrl,
        },
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao gerar boleto:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
