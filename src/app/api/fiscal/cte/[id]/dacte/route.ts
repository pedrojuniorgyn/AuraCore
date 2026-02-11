import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import type { RouteContext } from "@/shared/infrastructure/di/with-di";
import { withAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, businessPartners, cteCargoDocuments, branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

/**
 * GET /api/fiscal/cte/:id/dacte
 * Gera PDF do DACTE (Documento Auxiliar do CTe)
 * 
 * @since E8 Fase 2.4 - Migrado para DI parcialmente
 * 
 * TODO (E8 Fase 2.5): Quando IDacteGenerator adapter for implementado:
 * 1. Buscar dados do CTe e converter para DacteInput
 * 2. Chamar DacteGeneratorService.generate(input)
 * 3. Passar DacteData para IDacteGenerator.generatePdf()
 * 
 * Por agora, mantemos a geração inline do PDF.
 */
export const GET = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  const { id } = await context.params;
  return withAuth(req, async (user, ctx) => {
    try {
      const cteId = parseInt(id);

      if (isNaN(cteId)) {
        return NextResponse.json(
          { error: "ID de CTe inválido" },
          { status: 400 }
        );
      }

      // 1. Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(eq(cteHeader.id, cteId));

      if (!cte) {
        return NextResponse.json(
          { error: "CTe não encontrado" },
          { status: 404 }
        );
      }

      // 2. Buscar tomador
      const taker = cte.takerId 
        ? (await db.select().from(businessPartners).where(eq(businessPartners.id, cte.takerId)))[0]
        : null;

      // 3. Buscar filial emitente
      const emitente = cte.branchId
        ? (await db.select().from(branches).where(eq(branches.id, cte.branchId)))[0]
        : null;

      // 4. Buscar documentos de carga
      const docs = await db
        .select()
        .from(cteCargoDocuments)
        .where(eq(cteCargoDocuments.cteHeaderId, cteId));

      // 5. Gerar PDF
      const pdf = await generateDactePdf(cte, taker, emitente, docs);

      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="DACTE_${cteId}.pdf"`,
        },
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao gerar DACTE:", error);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
});

/**
 * Gera o PDF do DACTE
 * 
 * TODO: Substituir por IDacteGenerator adapter quando implementado
 */
async function generateDactePdf(
  cte: Record<string, unknown>,
  taker: Record<string, unknown> | null,
  emitente: Record<string, unknown> | null,
  docs: Array<Record<string, unknown>>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(18).text("DACTE", { align: "center" });
      doc.fontSize(10).text("Documento Auxiliar do CTe Eletrônico", { align: "center" });
      doc.fontSize(8).text(
        `Modelo 57 - Série ${cte.serie ?? ''} - Nº ${cte.cteNumber ?? ''}`, 
        { align: "center" }
      );
      doc.moveDown();

      // Emitente
      if (emitente) {
        doc.fontSize(12).text("EMITENTE (TRANSPORTADORA):", { underline: true });
        doc.fontSize(10).text(`Razão Social: ${emitente.name ?? 'N/A'}`);
        doc.fontSize(10).text(`CNPJ: ${formatDocument(String(emitente.document ?? ''))}`);
        doc.moveDown();
      }

      // Chave de acesso
      doc.fontSize(8).text(`Chave de Acesso: ${cte.cteKey ?? 'N/A'}`, { align: "center" });
      if (cte.protocolNumber) {
        doc.fontSize(8).text(`Protocolo: ${cte.protocolNumber}`, { align: "center" });
      }
      doc.moveDown(2);

      // Tomador
      doc.fontSize(12).text("TOMADOR DO SERVIÇO:", { underline: true });
      doc.fontSize(10).text(`Nome: ${taker?.name ?? 'N/A'}`);
      doc.fontSize(10).text(`CPF/CNPJ: ${formatDocument(String(taker?.document ?? ''))}`);
      doc.moveDown();

      // Valores
      doc.fontSize(12).text("VALORES:", { underline: true });
      doc.fontSize(10).text(`Valor do Frete: ${formatCurrency(parseFloat(String(cte.serviceValue ?? '0')))}`);
      doc.fontSize(10).text(`ICMS: ${formatCurrency(parseFloat(String(cte.icmsValue ?? '0')))}`);
      doc.fontSize(10).text(`Total: ${formatCurrency(parseFloat(String(cte.totalValue ?? '0')))}`);
      doc.moveDown();

      // Documentos
      if (docs.length > 0) {
        doc.fontSize(12).text("DOCUMENTOS DE CARGA:", { underline: true });
        docs.forEach((d) => {
          const docKey = (d as { documentKey?: string }).documentKey || "";
          doc.fontSize(9).text(`• NFe: ${docKey}`);
        });
      }

      doc.moveDown(2);
      doc.fontSize(8).text(
        `Emissão: ${new Date().toLocaleString("pt-BR")}`, 
        { align: "center" }
      );
      doc.fontSize(7).text(
        "Documento emitido por sistema eletrônico conforme legislação vigente.", 
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDocument(doc: string): string {
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return doc;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
