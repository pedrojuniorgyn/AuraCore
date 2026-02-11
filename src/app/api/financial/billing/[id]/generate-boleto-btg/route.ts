import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IBtgClient } from "@/modules/integrations/domain/ports/output/IBtgClient";
import sql from "mssql";

import { logger } from '@/shared/infrastructure/logging';
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/financial/billing/:id/generate-boleto-btg
 * Gerar boleto BTG para uma fatura
 */
export const POST = withDI(async (_request: NextRequest, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const billingId = parseInt(resolvedParams.id);
    if (!Number.isFinite(billingId) || billingId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await ensureConnection();

    // Buscar fatura
    const billingResult = await pool
      .request()
      .input("billingId", sql.Int, billingId)
      .input("orgId", sql.Int, Number(session.user.organizationId))
      .query(
        `
        SELECT
          b.*,
          p.company_name as customer_name,
          p.document as customer_document,
          p.email as customer_email
        FROM billing_invoices b
        LEFT JOIN business_partners p ON p.id = b.customer_id
        WHERE b.id = @billingId
          AND b.organization_id = @orgId
      `
      );

    if (billingResult.recordset.length === 0) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    }

    const billing = billingResult.recordset[0];

    // Verificar se já tem boleto BTG
    const existingResult = await pool
      .request()
      .input("billingId", sql.Int, billingId)
      .query(
        `
        SELECT * FROM btg_boletos
        WHERE billing_invoice_id = @billingId
          AND status NOT IN ('CANCELLED')
      `
      );

    if (existingResult.recordset.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Já existe um boleto BTG para esta fatura",
        boleto: existingResult.recordset[0],
      }, { status: 400 });
    }

    // Gerar boleto via BTG usando DI
    const btgClient = container.resolve<IBtgClient>(TOKENS.BtgClient);
    const btgBoleto = await btgClient.generateBoleto({
      payerName: billing.customer_name,
      payerDocument: billing.customer_document,
      payerEmail: billing.customer_email,
      valor: billing.total_amount,
      dataVencimento: billing.due_date.toISOString().split("T")[0],
      seuNumero: billing.invoice_number,
      descricao: `Fatura ${billing.invoice_number} - Serviços de Transporte`,
      instrucoes: "Não receber após o vencimento",
    });

    // Salvar no banco
    const result = await pool
      .request()
      .input("orgId", sql.Int, Number(session.user.organizationId))
      .input("nossoNumero", sql.NVarChar(100), String(btgBoleto.nosso_numero))
      .input("seuNumero", sql.NVarChar(100), String(billing.invoice_number))
      .input("customerId", sql.Int, Number(billing.customer_id))
      .input("payerName", sql.NVarChar(255), String(billing.customer_name ?? ""))
      .input("payerDocument", sql.NVarChar(50), String(billing.customer_document ?? ""))
      .input("valorNominal", sql.Decimal(18, 2), Number(billing.total_amount))
      .input("dataVenc", sql.DateTime2, new Date(billing.due_date))
      .input("btgId", sql.NVarChar(100), String(btgBoleto.id))
      .input("linhaDigitavel", sql.NVarChar(200), String(btgBoleto.linha_digitavel))
      .input("codigoBarras", sql.NVarChar(200), String(btgBoleto.codigo_barras))
      .input("pdfUrl", sql.NVarChar(500), String(btgBoleto.pdf_url))
      .input("billingId", sql.Int, billingId)
      .input("createdBy", sql.NVarChar(255), String(session.user.id))
      .query(
        `
        INSERT INTO btg_boletos (
          organization_id, nosso_numero, seu_numero,
          customer_id, payer_name, payer_document,
          valor_nominal, data_emissao, data_vencimento,
          status, btg_id, linha_digitavel, codigo_barras, pdf_url,
          billing_invoice_id,
          created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @orgId,
          @nossoNumero,
          @seuNumero,
          @customerId,
          @payerName,
          @payerDocument,
          @valorNominal,
          GETDATE(),
          @dataVenc,
          'REGISTERED',
          @btgId,
          @linhaDigitavel,
          @codigoBarras,
          @pdfUrl,
          @billingId,
          @createdBy,
          GETDATE()
        )
      `
      );

    // Atualizar fatura com boleto
    await pool
      .request()
      .input("billingId", sql.Int, billingId)
      .input("boletoUrl", sql.NVarChar(500), String(btgBoleto.pdf_url))
      .input("linhaDigitavel", sql.NVarChar(200), String(btgBoleto.linha_digitavel))
      .query(
        `
        UPDATE billing_invoices
        SET
          boleto_url = @boletoUrl,
          boleto_linha_digitavel = @linhaDigitavel,
          updated_at = GETDATE()
        WHERE id = @billingId
      `
      );

    return NextResponse.json({
      success: true,
      message: "Boleto BTG gerado com sucesso!",
      boleto: result.recordset[0],
      btgData: btgBoleto,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao gerar boleto BTG para fatura:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});














