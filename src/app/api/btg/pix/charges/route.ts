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
 * GET /api/btg/pix/charges
 * Lista cobranças Pix BTG
 */
export const GET = withDI(async () => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureConnection();

    const result = await pool.request().query(`
      SELECT * FROM btg_pix_charges
      WHERE organization_id = ${session.user.organizationId}
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      charges: result.recordset,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar Pix BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/btg/pix/charges
 * Criar cobrança Pix BTG
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
      valor,
      chavePix,
      expiracao,
      descricao,
      accountsReceivableId,
    } = body;

    if (!valor || !chavePix) {
      return NextResponse.json(
        { error: "Valor e chave Pix são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar cobrança via BTG usando DI
    const btgClient = container.resolve<IBtgClient>(TOKENS.BtgClient);
    const btgPix = await btgClient.createPixCharge({
      valor,
      chavePix,
      payerName,
      payerDocument,
      expiracao,
      descricao,
    });

    await ensureConnection();

    // Calcular data de expiração
    const expiracaoDate = new Date();
    expiracaoDate.setSeconds(expiracaoDate.getSeconds() + (expiracao || 86400));

    // Salvar no banco
    const result = await pool.request().query(`
      INSERT INTO btg_pix_charges (
        organization_id, txid, customer_id,
        payer_name, payer_document, valor, chave_pix,
        qr_code, status, data_expiracao,
        accounts_receivable_id,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId},
        '${btgPix.txid}',
        ${customerId || "NULL"},
        ${payerName ? `'${payerName}'` : "NULL"},
        ${payerDocument ? `'${payerDocument}'` : "NULL"},
        ${valor},
        '${chavePix}',
        '${btgPix.qrCode}',
        'ACTIVE',
        '${expiracaoDate.toISOString()}',
        ${accountsReceivableId || "NULL"},
        '${session.user.id}',
        GETDATE()
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Cobrança Pix BTG criada com sucesso!",
      charge: result.recordset[0],
      btgData: btgPix,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar Pix BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});
































