import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";

// Legacy: buildCteXml ainda busca dados do banco e monta XML
// TODO (E8 Fase 3): Criar Use Case que orquestre busca + CteBuilderService
import { buildCteXml } from "@/services/fiscal/cte-builder";
import { createXmlSignerFromDb } from "@/services/fiscal/xml-signer";

/**
 * POST /api/fiscal/cte/:id/authorize
 * 🔐 Requer permissão: fiscal.cte.authorize
 * 
 * Autoriza um CTe na Sefaz
 * 
 * @since E8 Fase 2.4 - Migração parcial:
 *   - ISefazGateway via DI (novo)
 *   - buildCteXml ainda legacy (busca DB)
 *   - Assinatura digital ainda legacy
 * 
 * TODO (E8 Fase 3): Criar AuthorizeCteUseCase que orquestre:
 *   1. Buscar dados da ordem de coleta
 *   2. CteBuilderService.build() para gerar XML
 *   3. XmlSignerService (Domain Service) para assinar
 *   4. ISefazGateway.authorizeCte() para enviar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.authorize", async (user, ctx) => {
    const resolvedParams = await params;
    const cteId = parseInt(resolvedParams.id);

    if (isNaN(cteId)) {
      return NextResponse.json(
        { error: "ID de CTe inválido" },
        { status: 400 }
      );
    }

    // 1. Buscar CTe
    const [cte] = await db
      .select()
      .from(cteHeader)
      .where(eq(cteHeader.id, cteId));

    if (!cte) {
      return NextResponse.json(
        { error: "CTe não encontrado" },
        { status: 404 }
      );
    }

    // 2. Verificar se já está autorizado
    if (cte.status === "AUTHORIZED") {
      return NextResponse.json(
        {
          error: "CTe já está autorizado",
          chave: cte.cteKey,
          protocolo: cte.protocolNumber,
        },
        { status: 400 }
      );
    }

    // 3. Verificar se está cancelado
    if (cte.status === "CANCELLED") {
      return NextResponse.json(
        { error: "CTe está cancelado, não pode ser autorizado" },
        { status: 400 }
      );
    }

    try {
      // 4. Verificar ordem de coleta
      if (!cte.pickupOrderId) {
        return NextResponse.json(
          { error: "CTe sem ordem de coleta vinculada" },
          { status: 400 }
        );
      }

      // 5. Buscar configurações fiscais
      if (!ctx.branchId) {
        return NextResponse.json({ error: "branchId obrigatório" }, { status: 400 });
      }

      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, ctx.organizationId),
            eq(fiscalSettings.branchId, ctx.branchId)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologation";

      // 6. Gerar XML (legacy - busca dados do DB)
      console.log(`🔨 Gerando XML do CTe #${cteId}...`);
      const xmlSemAssinatura = await buildCteXml({
        pickupOrderId: cte.pickupOrderId,
        organizationId: ctx.organizationId,
      });

      // 7. Assinar XML (legacy)
      console.log("🔐 Assinando XML...");
      const signer = await createXmlSignerFromDb(ctx.organizationId);
      
      const certInfo = signer.verifyCertificate();
      if (!certInfo.valid) {
        return NextResponse.json(
          {
            success: false,
            error: "Certificado digital inválido ou vencido",
          },
          { status: 400 }
        );
      }

      const xmlAssinado = signer.signCteXml(xmlSemAssinatura);
      console.log("✅ XML assinado com sucesso");

      // 8. Extrair UF do emitente do XML
      const ufMatch = xmlSemAssinatura.match(/<enderEmit>[\s\S]*?<UF>(.*?)<\/UF>/);
      const uf = ufMatch?.[1] || "SP";

      // 9. Autorizar via ISefazGateway (DI) - NOVO!
      console.log(`🚀 Autorizando CTe #${cteId} na Sefaz ${uf}...`);
      const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);

      const authResult = await sefazGateway.authorizeCte({
        cteXml: xmlAssinado,
        environment,
        uf,
      });

      if (Result.isFail(authResult)) {
        return NextResponse.json(
          {
            success: false,
            error: "Erro ao comunicar com SEFAZ",
            motivo: authResult.error,
          },
          { status: 500 }
        );
      }

      const resultado = authResult.value;

      // 10. Processar resultado
      if (resultado.success) {
        // Atualizar CTe no banco
        await db
          .update(cteHeader)
          .set({
            status: "AUTHORIZED",
            cteKey: resultado.cteKey,
            protocolNumber: resultado.protocolNumber,
            authorizationDate: resultado.authorizationDate,
            updatedAt: new Date(),
          })
          .where(eq(cteHeader.id, cteId));

        return NextResponse.json({
          success: true,
          message: "CTe autorizado com sucesso na Sefaz!",
          data: {
            cteId,
            chave: resultado.cteKey,
            protocolo: resultado.protocolNumber,
            dataAutorizacao: resultado.authorizationDate,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "CTe rejeitado pela Sefaz",
            motivo: resultado.rejectionMessage,
            codigoRejeicao: resultado.rejectionCode,
          },
          { status: 422 }
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao autorizar CTe:", error);
      return NextResponse.json(
        {
          error: "Erro ao autorizar CTe",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
