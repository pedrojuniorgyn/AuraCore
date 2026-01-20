/**
 * GET /api/financial/billing/:id/pdf
 * Gera e retorna PDF da fatura
 * 
 * @since E9 Fase 2 - Migrado para IBillingPdfGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import path from "path";
import { container } from "@/shared/infrastructure/di/container";
import { FINANCIAL_TOKENS } from "@/modules/financial/infrastructure/di/FinancialModule";
import type { IBillingPdfGateway } from "@/modules/financial/domain/ports/output/IBillingPdfGateway";
import { Result } from "@/shared/domain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user, ctx) => {
    const resolvedParams = await params;
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
      console.log(`📄 Gerando PDF da fatura #${billingId}...`);

      // Resolver gateway via DI
      const billingPdf = container.resolve<IBillingPdfGateway>(FINANCIAL_TOKENS.BillingPdfGateway);

      // Gerar PDF via Gateway
      const result = await billingPdf.generatePdf({
        billingId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId ?? 1,
      });

      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      const pdfBuffer = result.value;

      // Salvar PDF (opcional - para histórico)
      const fileName = `fatura-${billingId}-${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), "public", "billing", fileName);
      
      try {
        await writeFile(filePath, pdfBuffer);
        
        // Atualizar URL no banco
        await db
          .update(billingInvoices)
          .set({
            pdfUrl: `/billing/${fileName}`,
            updatedAt: new Date(),
          })
          .where(eq(billingInvoices.id, billingId));
      } catch (err) {
        console.warn("⚠️ Não foi possível salvar PDF em disco, continuando...");
      }

      console.log("✅ PDF gerado com sucesso!");

      // Retornar PDF
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="fatura-${billingId}.pdf"`,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao gerar PDF:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
