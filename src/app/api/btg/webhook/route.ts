import { NextRequest, NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";
import sql from "mssql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/btg/webhook
 * Recebe notificações de pagamento do BTG
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("🔔 Webhook BTG recebido:", body);

    // Validar assinatura do webhook (se BTG enviar)
    // const signature = request.headers.get("X-BTG-Signature");
    // TODO: Validar assinatura

    const { type, data } = body;

    await ensureConnection();

    if (type === "boleto.paid" || type === "billing.slip.paid") {
      // Boleto foi pago
      const boletoId = data.id || data.slip_id;
      const valorPagoRaw = data.paid_amount ? data.paid_amount / 100 : data.amount;
      const valorPago = Number(valorPagoRaw);
      if (!boletoId || !Number.isFinite(valorPago)) {
        return NextResponse.json(
          { success: false, error: "Payload inválido (boletoId/valorPago)" },
          { status: 400 }
        );
      }

      // Atualizar boleto no banco
      await pool
        .request()
        .input("boletoId", sql.NVarChar(100), String(boletoId))
        .input("valorPago", sql.Decimal(18, 2), valorPago)
        .query(
          `
          UPDATE btg_boletos
          SET
            status = 'PAID',
            valor_pago = @valorPago,
            data_pagamento = GETDATE(),
            webhook_received_at = GETDATE(),
            updated_at = GETDATE()
          WHERE btg_id = @boletoId
        `
        );

      // Buscar boleto para atualizar vinculações
      const boletoResult = await pool
        .request()
        .input("boletoId", sql.NVarChar(100), String(boletoId))
        .query(
          `
          SELECT * FROM btg_boletos
          WHERE btg_id = @boletoId
        `
        );

      if (boletoResult.recordset.length > 0) {
        const boleto = boletoResult.recordset[0];

        // Atualizar Contas a Receber
        if (boleto.accounts_receivable_id) {
          await pool
            .request()
            .input("arId", sql.Int, Number(boleto.accounts_receivable_id))
            .input("valorPago", sql.Decimal(18, 2), valorPago)
            .query(
              `
              UPDATE accounts_receivable
              SET
                status = 'PAID',
                paid_at = GETDATE(),
                paid_amount = @valorPago
              WHERE id = @arId
            `
            );
        }

        console.log(`✅ Boleto ${boleto.nosso_numero} marcado como pago!`);
      }
    } else if (type === "pix.paid" || type === "pix.received") {
      // Pix foi pago
      const txid = data.txid;
      const valorPagoRaw = data.valor || data.amount;
      const valorPago = Number(valorPagoRaw);
      if (!txid || !Number.isFinite(valorPago)) {
        return NextResponse.json(
          { success: false, error: "Payload inválido (txid/valorPago)" },
          { status: 400 }
        );
      }

      await pool
        .request()
        .input("txid", sql.NVarChar(100), String(txid))
        .query(
          `
          UPDATE btg_pix_charges
          SET
            status = 'PAID',
            data_pagamento = GETDATE()
          WHERE txid = @txid
        `
        );

      // Buscar cobrança para atualizar vinculações
      const pixResult = await pool
        .request()
        .input("txid", sql.NVarChar(100), String(txid))
        .query(
          `
          SELECT * FROM btg_pix_charges
          WHERE txid = @txid
        `
        );

      if (pixResult.recordset.length > 0) {
        const pix = pixResult.recordset[0];

        // Atualizar Contas a Receber
        if (pix.accounts_receivable_id) {
          await pool
            .request()
            .input("arId", sql.Int, Number(pix.accounts_receivable_id))
            .input("valorPago", sql.Decimal(18, 2), valorPago)
            .query(
              `
              UPDATE accounts_receivable
              SET
                status = 'PAID',
                paid_at = GETDATE(),
                paid_amount = @valorPago
              WHERE id = @arId
            `
            );
        }

        console.log(`✅ Pix ${txid} marcado como pago!`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao processar webhook BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}














