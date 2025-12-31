/**
 * DACTE GENERATOR - SPRINT 2
 * Gera PDF do DACTE (Documento Auxiliar do CTe)
 */

import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { cteHeader, businessPartners, cteCargoDocuments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function generateDACTE(cteId: number): Promise<Buffer> {
  // Buscar CTe
  const [cte] = await db
    .select()
    .from(cteHeader)
    .where(eq(cteHeader.id, cteId));

  if (!cte) throw new Error("CTe não encontrado");

  // Buscar tomador
  const [taker] = await db
    .select()
    .from(businessPartners)
    .where(eq(businessPartners.id, cte.takerId));

  // Buscar documentos de carga
  const docs = await db
    .select()
    .from(cteCargoDocuments)
    .where(eq(cteCargoDocuments.cteHeaderId, cteId));

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc.fontSize(18).text("DACTE", { align: "center" });
  doc.fontSize(10).text(`Documento Auxiliar do CTe Eletrônico`, { align: "center" });
  doc.fontSize(8).text(`Modelo 57 - Série ${cte.serie} - Nº ${cte.cteNumber}`, { align: "center" });
  doc.moveDown();

  // Chave de acesso
  doc.fontSize(8).text(`Chave: ${cte.cteKey}`, { align: "center" });
  doc.moveDown(2);

  // Tomador
  doc.fontSize(12).text("TOMADOR DO SERVIÇO:", { underline: true });
  doc.fontSize(10).text(`Nome: ${taker?.name || "N/A"}`);
  doc.fontSize(10).text(`CNPJ: ${taker?.document || "N/A"}`);
  doc.moveDown();

  // Valores
  doc.fontSize(12).text("VALORES:", { underline: true });
  doc.fontSize(10).text(`Valor do Frete: R$ ${parseFloat(cte.serviceValue || "0").toFixed(2)}`);
  doc.fontSize(10).text(`ICMS: R$ ${parseFloat(cte.icmsValue || "0").toFixed(2)}`);
  doc.fontSize(10).text(`Total: R$ ${parseFloat(cte.totalValue || "0").toFixed(2)}`);
  doc.moveDown();

  // Documentos
  if (docs.length > 0) {
    doc.fontSize(12).text("DOCUMENTOS DE CARGA:", { underline: true });
    docs.forEach((d: any) => {
      doc.fontSize(9).text(`• NFe: ${d.documentKey}`);
    });
  }

  doc.moveDown(2);
  doc.fontSize(8).text(`Emissão: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}





























