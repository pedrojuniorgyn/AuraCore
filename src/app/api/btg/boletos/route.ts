import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IBtgClient } from "@/modules/integrations/domain/ports/output/IBtgClient";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/btg/boletos
 * Lista boletos BTG
 */
export const GET = withDI(async () => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureConnection();

    const result = await pool.request().query(`
      SELECT * FROM btg_boletos
      WHERE organization_id = ${session.user.organizationId}
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      boletos: result.recordset,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar boletos BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/btg/boletos
 * Criar boleto BTG
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      payerName,
      payerDocument,
      payerEmail,
      valor,
      dataVencimento,
      seuNumero,
      descricao,
      accountsReceivableId,
      billingInvoiceId,
    } = body;

    if (!payerName || !payerDocument || !valor || !dataVencimento) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Gerar boleto via BTG usando DI
    const btgClient = container.resolve<IBtgClient>(TOKENS.BtgClient);
    const btgBoleto = await btgClient.generateBoleto({
      payerName,
      payerDocument,
      payerEmail,
      valor,
      dataVencimento,
      seuNumero,
      descricao,
    });

    await ensureConnection();

    // Salvar no banco
    const result = await pool.request().query(`
      INSERT INTO btg_boletos (
        organization_id, nosso_numero, seu_numero,
        customer_id, payer_name, payer_document,
        valor_nominal, data_emissao, data_vencimento,
        status, btg_id, linha_digitavel, codigo_barras, pdf_url,
        accounts_receivable_id, billing_invoice_id,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId},
        '${btgBoleto.nosso_numero}',
        ${seuNumero ? `'${seuNumero}'` : "NULL"},
        ${customerId || "NULL"},
        '${payerName}',
        '${payerDocument}',
        ${valor},
        GETDATE(),
        '${dataVencimento}',
        'REGISTERED',
        '${btgBoleto.id}',
        '${btgBoleto.linha_digitavel}',
        '${btgBoleto.codigo_barras}',
        '${btgBoleto.pdf_url}',
        ${accountsReceivableId || "NULL"},
        ${billingInvoiceId || "NULL"},
        '${session.user.id}',
        GETDATE()
      )
    `);

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
    logger.error("❌ Erro ao criar boleto BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});
































