/**
 * POST /api/financial/billing/:id/send-email
 * 🔐 Requer permissão: financial.billing.create
 * 
 * Envia fatura por email
 * 
 * @since E9 Fase 2 - Migrado para IBillingPdfGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { billingInvoices } from "@/modules/financial/infrastructure/persistence/schemas";
import { businessPartners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { container } from "@/shared/infrastructure/di/container";
import { FINANCIAL_TOKENS } from "@/modules/financial/infrastructure/di/FinancialModule";
import type { IBillingPdfGateway } from "@/modules/financial/domain/ports/output/IBillingPdfGateway";
import { Result } from "@/shared/domain";

import { logger } from '@/shared/infrastructure/logging';
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  return withPermission(request, "financial.billing.create", async (user, ctx) => {
    const resolvedParams = await context.params;
    const billingId = parseInt(resolvedParams.id);

    if (isNaN(billingId)) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
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

      // Gerar PDF via Gateway DI
      logger.info("📄 Gerando PDF da fatura...");
      const billingPdf = container.resolve<IBillingPdfGateway>(FINANCIAL_TOKENS.BillingPdfGateway);
      
      const pdfResult = await billingPdf.generatePdf({
        billingId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId ?? 1,
      });

      if (Result.isFail(pdfResult)) {
        return NextResponse.json({ error: pdfResult.error }, { status: 500 });
      }

      const pdfBuffer = pdfResult.value;

      // Configurar transporter SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });

      // Enviar email
      logger.info(`📧 Enviando fatura para ${email}...`);
      
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

      logger.info("✅ Email enviado com sucesso!");

      return NextResponse.json({
        success: true,
        message: "Fatura enviada por email com sucesso!",
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ Erro ao enviar email:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
});
