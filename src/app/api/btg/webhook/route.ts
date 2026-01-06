import { NextRequest, NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";
import sql from "mssql";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function runSqlTransaction<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (e) {
    try {
      await tx.rollback();
    } catch {
      // ignore
    }
    throw e;
  }
}

/**
 * POST /api/btg/webhook
 * Recebe notificações de pagamento do BTG
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    log("info", "btg.webhook.received", { type: body?.type });

    // Validar assinatura do webhook (se BTG enviar)
    // const signature = request.headers.get("X-BTG-Signature");
    // TODO: Validar assinatura

    const { type, data } = body;

    await ensureConnection();

    const scope = "btg.webhook";

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

      // Descobrir organizationId (multi-tenant) a partir do boleto
      const boletoOrg = await pool
        .request()
        .input("boletoId", sql.NVarChar(100), String(boletoId))
        .query(
          `
          SELECT TOP 1 organization_id AS organizationId
          FROM btg_boletos
          WHERE btg_id = @boletoId
        `
        );

      const organizationId = Number((boletoOrg.recordset?.[0] as any)?.organizationId ?? 0);
      if (!Number.isFinite(organizationId) || organizationId <= 0) {
        // Não temos como aplicar idempotência/tenancy; evita falhar webhook
        log("warn", "btg.webhook.unknown_boleto", { boletoId });
        return NextResponse.json({ success: true, ignored: true, message: "Boleto não encontrado" });
      }

      const idemKey = `boleto.paid:${String(boletoId)}:${valorPago.toFixed(2)}`.slice(0, 128);
      const idem = await acquireIdempotency({ organizationId, scope, key: idemKey, ttlMinutes: 24 * 60 });
      if (idem.outcome !== "execute") {
        return NextResponse.json({
          success: true,
          idempotency: idem.outcome,
          message: "Webhook já processado (efeito único)",
        });
      }

      // Atualizar boleto no banco
      try {
        const arId = await runSqlTransaction(async (tx) => {
          const update = await new sql.Request(tx)
            .input("orgId", sql.Int, organizationId)
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
                AND organization_id = @orgId
            `
            );

          const affected = Number(update.rowsAffected?.[0] ?? 0);
          if (affected <= 0) {
            // nada atualizado -> não prossegue (evita marcar idempotência como sucesso sem aplicar efeito)
            throw new Error("Boleto não encontrado para atualização");
          }

          const boletoResult = await new sql.Request(tx)
            .input("orgId", sql.Int, organizationId)
            .input("boletoId", sql.NVarChar(100), String(boletoId))
            .query(
              `
              SELECT TOP 1 accounts_receivable_id AS arId
              FROM btg_boletos
              WHERE btg_id = @boletoId
                AND organization_id = @orgId
            `
            );

          const arId = Number((boletoResult.recordset?.[0] as any)?.arId ?? 0);
          if (Number.isFinite(arId) && arId > 0) {
            const arUpdate = await new sql.Request(tx)
              .input("orgId", sql.Int, organizationId)
              .input("arId", sql.Int, arId)
              .input("valorPago", sql.Decimal(18, 2), valorPago)
              .query(
                `
                UPDATE accounts_receivable
                SET
                  status = 'PAID',
                  paid_at = GETDATE(),
                  paid_amount = @valorPago
                WHERE id = @arId
                  AND organization_id = @orgId
              `
              );
            const arAffected = Number(arUpdate.rowsAffected?.[0] ?? 0);
            if (arAffected <= 0) {
              throw new Error("Falha ao atualizar accounts_receivable (registro não encontrado)");
            }
          }

          return arId;
        });

        log("info", "btg.webhook.boleto_paid", { organizationId, boletoId, arId: arId || null });

        // Idempotência: best-effort (não derruba o webhook se finalizar falhar)
        try {
          await finalizeIdempotency({ organizationId, scope, key: idemKey, status: "SUCCEEDED", resultRef: "ok" });
        } catch (e: unknown) {
          log("warn", "btg.webhook.idempotency_finalize_failed", { organizationId, scope, error: e });
        }
      } catch (e: unknown) {
        try {
          await finalizeIdempotency({
            organizationId,
            scope,
            key: idemKey,
            status: "FAILED",
            errorMessage: e?.message ?? String(e),
          });
        } catch (e2: unknown) {
          log("warn", "btg.webhook.idempotency_finalize_failed", { organizationId, scope, error: e2 });
        }
        throw e;
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

      // Descobrir organizationId (multi-tenant) a partir do txid
      const pixOrg = await pool
        .request()
        .input("txid", sql.NVarChar(100), String(txid))
        .query(
          `
          SELECT TOP 1 organization_id AS organizationId
          FROM btg_pix_charges
          WHERE txid = @txid
        `
        );

      const organizationId = Number((pixOrg.recordset?.[0] as any)?.organizationId ?? 0);
      if (!Number.isFinite(organizationId) || organizationId <= 0) {
        log("warn", "btg.webhook.unknown_pix", { txid });
        return NextResponse.json({ success: true, ignored: true, message: "Cobrança Pix não encontrada" });
      }

      const idemKey = `pix.paid:${String(txid)}:${valorPago.toFixed(2)}`.slice(0, 128);
      const idem = await acquireIdempotency({ organizationId, scope, key: idemKey, ttlMinutes: 24 * 60 });
      if (idem.outcome !== "execute") {
        return NextResponse.json({
          success: true,
          idempotency: idem.outcome,
          message: "Webhook já processado (efeito único)",
        });
      }

      try {
        const arId = await runSqlTransaction(async (tx) => {
          const update = await new sql.Request(tx)
            .input("orgId", sql.Int, organizationId)
            .input("txid", sql.NVarChar(100), String(txid))
            .query(
              `
              UPDATE btg_pix_charges
              SET
                status = 'PAID',
                data_pagamento = GETDATE()
              WHERE txid = @txid
                AND organization_id = @orgId
            `
            );

          const affected = Number(update.rowsAffected?.[0] ?? 0);
          if (affected <= 0) {
            throw new Error("Cobrança Pix não encontrada para atualização");
          }

          const pixResult = await new sql.Request(tx)
            .input("orgId", sql.Int, organizationId)
            .input("txid", sql.NVarChar(100), String(txid))
            .query(
              `
              SELECT TOP 1 accounts_receivable_id AS arId
              FROM btg_pix_charges
              WHERE txid = @txid
                AND organization_id = @orgId
            `
            );

          const arId = Number((pixResult.recordset?.[0] as any)?.arId ?? 0);
          if (Number.isFinite(arId) && arId > 0) {
            const arUpdate = await new sql.Request(tx)
              .input("orgId", sql.Int, organizationId)
              .input("arId", sql.Int, arId)
              .input("valorPago", sql.Decimal(18, 2), valorPago)
              .query(
                `
                UPDATE accounts_receivable
                SET
                  status = 'PAID',
                  paid_at = GETDATE(),
                  paid_amount = @valorPago
                WHERE id = @arId
                  AND organization_id = @orgId
              `
              );
            const arAffected = Number(arUpdate.rowsAffected?.[0] ?? 0);
            if (arAffected <= 0) {
              throw new Error("Falha ao atualizar accounts_receivable (registro não encontrado)");
            }
          }

          return arId;
        });

        log("info", "btg.webhook.pix_paid", { organizationId, txid, arId: arId || null });

        // Idempotência: best-effort (não derruba o webhook se finalizar falhar)
        try {
          await finalizeIdempotency({ organizationId, scope, key: idemKey, status: "SUCCEEDED", resultRef: "ok" });
        } catch (e: unknown) {
          log("warn", "btg.webhook.idempotency_finalize_failed", { organizationId, scope, error: e });
        }
      } catch (e: unknown) {
        try {
          await finalizeIdempotency({
            organizationId,
            scope,
            key: idemKey,
            status: "FAILED",
            errorMessage: e?.message ?? String(e),
          });
        } catch (e2: unknown) {
          log("warn", "btg.webhook.idempotency_finalize_failed", { organizationId, scope, error: e2 });
        }
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    });
  } catch (error: unknown) {
    log("error", "btg.webhook.error", { error });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}














