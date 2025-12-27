import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { billingPDFGenerator } from "@/services/financial/billing-pdf-generator";
import { db } from "@/lib/db";
import { billingInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import path from "path";

/**
 * GET /api/financial/billing/:id/pdf
 * Gera e retorna PDF da fatura
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user, ctx) => {
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
    const resolvedParams = await params;
      console.log(`📄 Gerando PDF da fatura #${billingId}...`);

      // Gerar PDF
      const pdfBuffer = await billingPDFGenerator.gerarPDF(billingId);

      // Salvar PDF (opcional - para histórico)
      const fileName = `fatura-${billingId}-${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), "public", "billing", fileName);
      
      try {
    const resolvedParams = await params;
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
      return new NextResponse(pdfBuffer, {
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
















