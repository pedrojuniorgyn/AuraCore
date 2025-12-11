import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices, accountsReceivable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/financial/billing/:id/finalize
 * 🔐 Requer permissão: financial.billing.approve
 * 
 * Finaliza fatura e cria título no Contas a Receber
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "financial.billing.approve", async (user, ctx) => {
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
    const resolvedParams = await params;
      // Buscar fatura
      const [billing] = await db
        .select()
        .from(billingInvoices)
        .where(eq(billingInvoices.id, billingId));

      if (!billing) {
        return NextResponse.json(
          { error: "Fatura não encontrada" },
          { status: 404 }
        );
      }

      if (billing.status === "FINALIZED") {
        return NextResponse.json(
          { error: "Fatura já foi finalizada" },
          { status: 400 }
        );
      }

      if (!billing.barcodeNumber) {
        return NextResponse.json(
          { error: "Gere o boleto antes de finalizar a fatura" },
          { status: 400 }
        );
      }

      console.log(`✅ Finalizando fatura ${billing.invoiceNumber}...`);

      // Criar título no Contas a Receber
      const [receivable] = await db
        .insert(accountsReceivable)
        .values({
          organizationId: billing.organizationId,
          branchId: billing.branchId,
          partnerId: billing.customerId,
          
          documentNumber: billing.invoiceNumber,
          documentType: "BILLING",
          
          issueDate: billing.issueDate,
          dueDate: billing.dueDate,
          
          amount: billing.netValue,
          paidAmount: "0.00",
          remainingAmount: billing.netValue,
          
          status: "OPEN",
          
          description: `Faturamento consolidado - ${billing.totalCtes} CTes`,
          
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          version: 1,
        })
        .returning();

      // Atualizar fatura
      await db
        .update(billingInvoices)
        .set({
          accountsReceivableId: receivable.id,
          status: "FINALIZED",
          updatedAt: new Date(),
        })
        .where(eq(billingInvoices.id, billingId));

      console.log("✅ Fatura finalizada e título criado no Contas a Receber!");

      return NextResponse.json({
        success: true,
        message: "Fatura finalizada com sucesso!",
        data: {
          billingId,
          receivableId: receivable.id,
        },
      });
    } catch (error: any) {
      console.error("❌ Erro ao finalizar fatura:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}








