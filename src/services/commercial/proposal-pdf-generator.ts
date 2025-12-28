import PDFDocument from "pdfkit";

interface ProposalData {
  proposalNumber: string;
  companyName: string;
  contactName: string;
  routes: any[];
  prices: any[];
  conditions: any;
  validityDays: number;
}

export class ProposalPdfGenerator {
  public async generateProposalPdf(proposal: ProposalData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("PROPOSTA COMERCIAL", { align: "center" });

      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Proposta: ${proposal.proposalNumber}`, { align: "right" });
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, { align: "right" });

      doc.moveDown(2);

      // Cliente
      doc.fontSize(14).font("Helvetica-Bold").text("CLIENTE");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      doc.text(`Empresa: ${proposal.companyName}`);
      doc.text(`Contato: ${proposal.contactName}`);

      doc.moveDown(2);

      // Rotas e Preços
      doc.fontSize(14).font("Helvetica-Bold").text("ROTAS E VALORES");
      doc.moveDown(0.5);

      if (proposal.routes && proposal.routes.length > 0) {
        proposal.routes.forEach((route: any, index: number) => {
          doc.fontSize(11).font("Helvetica");
          doc.text(
            `${index + 1}. ${route.origin} → ${route.destination}: R$ ${parseFloat(
              route.price
            ).toFixed(2)}`
          );
        });
      }

      doc.moveDown(2);

      // Condições
      doc.fontSize(14).font("Helvetica-Bold").text("CONDIÇÕES COMERCIAIS");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      if (proposal.conditions) {
        doc.text(`Prazo de Pagamento: ${proposal.conditions.paymentTerm || "A definir"}`);
        doc.text(`Modal: ${proposal.conditions.modal || "Rodoviário"}`);
      }
      doc.text(`Validade da Proposta: ${proposal.validityDays} dias`);

      doc.moveDown(3);

      // Footer
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Aguardamos retorno para dar continuidade.", { align: "center" });

      doc.end();
    });
  }
}

export const proposalPdfGenerator = new ProposalPdfGenerator();

























