import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IBtgClient } from "@/modules/integrations/domain/ports/output/IBtgClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/btg/dda/sync
 * Sincronizar DDAs e débitos do BTG
 * 
 * E8 Fase 1.2: Migrado para usar IBtgClient via DI
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // BTG Company ID (obrigatório no .env)
    const btgCompanyId = process.env.BTG_COMPANY_ID;

    if (!btgCompanyId) {
      return NextResponse.json(
        {
          success: false,
          error: "BTG_COMPANY_ID não configurado no .env. Para Sandbox, use: BTG_COMPANY_ID=30306294000145",
        },
        { status: 400 }
      );
    }

    console.log("🔄 Sincronizando DDAs do BTG...", { companyId: btgCompanyId });

    // 1. Buscar DDAs do BTG usando DI
    const btgClient = container.resolve<IBtgClient>(TOKENS.BtgClient);
    const btgDDAs = await btgClient.listDdaAuthorized(btgCompanyId);

    await ensureConnection();

    let ddaCount = 0;
    let debitCount = 0;

    // 2. Salvar DDAs no banco
    for (const dda of btgDDAs) {
      const existing = await pool.request().query(`
        SELECT * FROM btg_dda_authorized
        WHERE btg_dda_id = '${dda.id}'
        AND organization_id = ${session.user.organizationId}
      `);

      if (existing.recordset.length === 0) {
        await pool.request().query(`
          INSERT INTO btg_dda_authorized (
            organization_id, btg_dda_id, btg_company_id,
            creditor_name, creditor_document, status, created_at
          )
          VALUES (
            ${session.user.organizationId},
            '${dda.id}',
            '${btgCompanyId}',
            '${dda.creditorName}',
            '${dda.creditorDocument}',
            '${dda.status}',
            GETDATE()
          )
        `);
        ddaCount++;
      }

      // 3. Buscar débitos deste DDA usando DI
      const debits = await btgClient.listDdaDebits({
        companyId: btgCompanyId,
        ddaId: dda.id,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // Últimos 90 dias
      });

      // 4. Salvar débitos no banco
      for (const debit of debits) {
        const existingDebit = await pool.request().query(`
          SELECT * FROM btg_dda_debits
          WHERE btg_debit_id = '${debit.id}'
          AND organization_id = ${session.user.organizationId}
        `);

        if (existingDebit.recordset.length === 0) {
          await pool.request().query(`
            INSERT INTO btg_dda_debits (
              organization_id, btg_debit_id, btg_dda_id,
              barcode, digitable_line, amount, due_date,
              creditor_name, creditor_document, description, status,
              imported_at, created_at
            )
            VALUES (
              ${session.user.organizationId},
              '${debit.id}',
              '${dda.id}',
              '${debit.barcode || ""}',
              '${debit.digitableLine || ""}',
              ${debit.amount},
              '${debit.dueDate}',
              '${debit.creditorName || dda.creditorName}',
              '${debit.creditorDocument || dda.creditorDocument}',
              ${debit.description ? `'${debit.description}'` : "NULL"},
              '${debit.status}',
              GETDATE(),
              GETDATE()
            )
          `);
          debitCount++;
        }
      }
    }

    console.log(`✅ Sincronização concluída: ${ddaCount} DDAs, ${debitCount} débitos`);

    return NextResponse.json({
      success: true,
      message: "DDAs sincronizados com sucesso!",
      stats: {
        ddas: ddaCount,
        debits: debitCount,
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao sincronizar DDAs:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

