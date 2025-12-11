import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices, businessPartners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { billingPDFGenerator } from "@/services/financial/billing-pdf-generator";
import nodemailer from "nodemailer";

/**
 * POST /api/financial/billing/:id/send-email
 * 🔐 Requer permissão: financial.billing.create
 * 
 * Envia fatura por email
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
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: "Email do destinatário é obrigatório" },
          { status: 400 }
        );
      }

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

      // Gerar PDF
      console.log("📄 Gerando PDF da fatura...");
      const pdfBuffer = await billingPDFGenerator.gerarPDF(billingId);

      // Configurar transporter SMTP
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });

      // Enviar email
      console.log(`📧 Enviando fatura para ${email}...`);
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `Fatura ${billing.invoice.invoiceNumber} - ${billing.customer?.name}`,
        html: `
          <h2>Fatura Consolidada</h2>
          <p>Prezado(a) <strong>${billing.customer?.name}</strong>,</p>
          <p>Segue em anexo a fatura consolidada referente ao período de 
          ${new Date(billing.invoice.periodStart).toLocaleDateString()} a 
          ${new Date(billing.invoice.periodEnd).toLocaleDateString()}.</p>
          
          <h3>Detalhes:</h3>
          <ul>
            <li><strong>Número da Fatura:</strong> ${billing.invoice.invoiceNumber}</li>
            <li><strong>Total de CTes:</strong> ${billing.invoice.totalCtes}</li>
            <li><strong>Valor Total:</strong> R$ ${parseFloat(billing.invoice.netValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
            <li><strong>Vencimento:</strong> ${new Date(billing.invoice.dueDate).toLocaleDateString()}</li>
          </ul>
          
          ${billing.invoice.barcodeNumber ? `
            <h3>Dados para Pagamento:</h3>
            <p><strong>Código de Barras:</strong> ${billing.invoice.barcodeNumber}</p>
          ` : ''}
          
          ${billing.invoice.pixKey ? `
            <p><strong>PIX (Copiar e Colar):</strong></p>
            <code style="background: #f4f4f4; padding: 10px; display: block; word-break: break-all;">
              ${billing.invoice.pixKey}
            </code>
          ` : ''}
          
          <p>Atenciosamente,<br>
          <strong>Equipe Financeira</strong></p>
        `,
        attachments: [
          {
            filename: `fatura-${billing.invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      // Atualizar fatura
      await db
        .update(billingInvoices)
        .set({
          sentAt: new Date(),
          sentTo: email,
          status: "SENT",
          updatedAt: new Date(),
        })
        .where(eq(billingInvoices.id, billingId));

      console.log("✅ Email enviado com sucesso!");

      return NextResponse.json({
        success: true,
        message: "Fatura enviada por email com sucesso!",
      });
    } catch (error: any) {
      console.error("❌ Erro ao enviar email:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}










