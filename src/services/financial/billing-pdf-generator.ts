import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { billingInvoices, billingItems, businessPartners, cteHeader } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Gerador de PDF para Faturas Consolidadas (Billing)
 */
export class BillingPDFGenerator {
  /**
   * Gerar PDF da fatura
   */
  public async gerarPDF(billingId: number): Promise<Buffer> {
    // 1. Buscar dados da fatura
    const [billing] = await db
      .select({
        invoice: billingInvoices,
        customer: businessPartners,
      })
      .from(billingInvoices)
      .leftJoin(businessPartners, eq(billingInvoices.customerId, businessPartners.id))
      .where(eq(billingInvoices.id, billingId));

    if (!billing) {
      throw new Error("Fatura não encontrada");
    }

    // 2. Buscar itens (CTes)
    const items = await db
      .select()
      .from(billingItems)
      .where(eq(billingItems.billingInvoiceId, billingId));

    // 3. Criar PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // 4. Cabeçalho
    doc.fontSize(20).text("FATURA CONSOLIDADA", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).text(`Fatura: ${billing.invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Emissão: ${this.formatDate(billing.invoice.issueDate)}`, { align: "right" });
    doc.text(`Vencimento: ${this.formatDate(billing.invoice.dueDate)}`, { align: "right" });
    doc.moveDown(2);

    // 5. Dados do Cliente
    doc.fontSize(12).text("DADOS DO CLIENTE:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Razão Social: ${billing.customer?.name || "N/A"}`);
    doc.text(`CNPJ: ${this.formatCNPJ(billing.customer?.document || "")}`);
    doc.moveDown(2);

    // 6. Resumo
    doc.fontSize(12).text("RESUMO DA FATURA:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Período: ${this.formatDate(billing.invoice.periodStart)} a ${this.formatDate(billing.invoice.periodEnd)}`);
    doc.text(`Total de CTes: ${billing.invoice.totalCtes}`);
    doc.text(`Valor Bruto: R$ ${this.formatMoney(billing.invoice.grossValue)}`);
    if (parseFloat(billing.invoice.discountValue || "0") > 0) {
      doc.text(`Desconto: R$ ${this.formatMoney(billing.invoice.discountValue)}`);
    }
    doc.fontSize(14).fillColor("green").text(`VALOR TOTAL: R$ ${this.formatMoney(billing.invoice.netValue)}`, { bold: true });
    doc.fillColor("black");
    doc.moveDown(2);

    // 7. Tabela de CTes
    doc.fontSize(12).text("RELAÇÃO DE CTes:", { underline: true });
    doc.moveDown(0.5);

    // Cabeçalho da tabela
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 120;
    const col3 = 200;
    const col4 = 280;
    const col5 = 360;
    const col6 = 480;

    doc.fontSize(9).fillColor("#333");
    doc.text("#", col1, tableTop);
    doc.text("Série", col2, tableTop);
    doc.text("Data", col3, tableTop);
    doc.text("Origem", col4, tableTop);
    doc.text("Destino", col5, tableTop);
    doc.text("Valor", col6, tableTop, { align: "right", width: 60 });

    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let y = tableTop + 20;

    // Linhas da tabela
    items.forEach((item, index) => {
      if (y > 700) {
        // Nova página se necessário
        doc.addPage();
        y = 50;
      }

      doc.fontSize(8).fillColor("#000");
      doc.text(item.cteNumber.toString(), col1, y);
      doc.text(item.cteSeries || "1", col2, y);
      doc.text(this.formatDate(item.cteIssueDate), col3, y);
      doc.text(item.originUf || "-", col4, y);
      doc.text(item.destinationUf || "-", col5, y);
      doc.text(`R$ ${this.formatMoney(item.cteValue)}`, col6, y, { align: "right", width: 60 });

      y += 18;

      // Linha separadora a cada 5 itens
      if ((index + 1) % 5 === 0) {
        doc.moveTo(col1, y - 2).lineTo(550, y - 2).strokeColor("#ddd").stroke();
        doc.strokeColor("#000");
      }
    });

    // 8. Rodapé com dados de pagamento
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#000");
    doc.text("DADOS PARA PAGAMENTO:", { underline: true });
    doc.moveDown(0.5);

    if (billing.invoice.barcodeNumber) {
      doc.text(`Código de Barras: ${billing.invoice.barcodeNumber}`);
    }

    if (billing.invoice.pixKey) {
      doc.text(`PIX (Copiar e Colar):`);
      doc.fontSize(7).text(billing.invoice.pixKey, { width: 500 });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#666");
    doc.text("Este documento foi gerado eletronicamente pelo sistema AuraCore.", { align: "center" });

    // Finalizar PDF
    doc.end();

    // Retornar buffer
    return new Promise((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
    });
  }

  /**
   * Helpers
   */
  private formatDate(date: Date | null): string {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  }

  private formatMoney(value: string | number | null): string {
    if (!value) return "0,00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatCNPJ(cnpj: string): string {
    if (!cnpj) return "";
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return cnpj;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
}

// Singleton
export const billingPDFGenerator = new BillingPDFGenerator();
















