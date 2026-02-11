import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import type { RouteContext } from '@/shared/infrastructure/di/with-di';
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

import { logger } from '@/shared/infrastructure/logging';
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/fiscal/nfe/:id/manifest
 * Enviar manifestação do destinatário (Ciência, Confirmação, Desconhecimento, Não Realizada)
 */
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const invoiceId = parseInt(id);

    const body = await request.json();
    const { eventType, justification } = body;

    // Validar tipo de evento
    const validEvents = ["210200", "210210", "210220", "210240"];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Tipo de evento inválido" },
        { status: 400 }
      );
    }

    // Se for desconhecimento (210220), justificativa é obrigatória
    if (eventType === "210220" && !justification) {
      return NextResponse.json(
        { error: "Justificativa é obrigatória para Desconhecimento" },
        { status: 400 }
      );
    }

    await ensureConnection();

    // Buscar NFe
    const invoiceResult = await pool.request().query(`
      SELECT * FROM inbound_invoices
      WHERE id = ${invoiceId}
      AND organization_id = ${session.user.organizationId}
    `);

    if (invoiceResult.recordset.length === 0) {
      return NextResponse.json({ error: "NFe não encontrada" }, { status: 404 });
    }

    const invoice = invoiceResult.recordset[0];

    // Descrições dos eventos
    const eventDescriptions: { [key: string]: string } = {
      "210200": "Ciência da Operação",
      "210210": "Confirmação da Operação",
      "210220": "Operação Desconhecida",
      "210240": "Operação Não Realizada",
    };

    // Criar registro de manifestação
    const result = await pool.request().query(`
      INSERT INTO nfe_manifestation_events (
        organization_id, inbound_invoice_id, event_type,
        event_description, justification,
        status, created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId}, ${invoiceId}, '${eventType}',
        '${eventDescriptions[eventType]}',
        ${justification ? `'${justification}'` : "NULL"},
        'PENDING', '${session.user.id}', GETDATE()
      )
    `);

    const manifestEvent = result.recordset[0];

    // TODO: Integração com SEFAZ para enviar manifestação
    // Por enquanto, apenas criar o registro
    // Em produção: usar webservice NFeDistribuicaoDFe

    logger.info(`📜 Manifestação criada: ${eventDescriptions[eventType]} para NFe ${invoice.access_key}`);

    return NextResponse.json({
      success: true,
      message: `Manifestação "${eventDescriptions[eventType]}" registrada com sucesso`,
      manifestation: manifestEvent,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao manifestar NFe:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});

