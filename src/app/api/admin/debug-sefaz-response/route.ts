import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";
import { db } from "@/lib/db";
import { branches, organizations } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/admin/debug-sefaz-response?branchId=1
 * Retorna resposta XML da Sefaz para debug
 * 
 * ⚠️ ADMIN ONLY: Rota de debug para desenvolvimento
 * 
 * @since E8 Fase 3 - Migrado para ISefazGateway via DI
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    
    const branchIdParam = request.nextUrl.searchParams.get("branchId");
    const branchId = branchIdParam ? parseInt(branchIdParam) : 1;

    console.log(`🔍 Debug Sefaz Response para branch ${branchId}`);

    // Buscar dados da filial
    const [branch] = await db
      .select({
        name: branches.name,
        state: branches.state,
      })
      .from(branches)
      .where(
        and(
          eq(branches.id, branchId),
          eq(branches.organizationId, ctx.organizationId),
          isNull(branches.deletedAt)
        )
      );

    if (!branch) {
      return NextResponse.json(
        { error: `Filial ${branchId} não encontrada` },
        { status: 404 }
      );
    }

    // Buscar CNPJ da organização
    const [org] = await db
      .select({ document: organizations.document })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId));

    const cnpj = org?.document?.replace(/\D/g, '') || '';

    // Resolver Gateway via DI
    const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);
    
    // Consultar SEFAZ
    const result = await sefazGateway.queryDistribuicaoDFe({
      cnpj,
      lastNsu: 0,
      environment: 'production',
    });

    if (Result.isFail(result)) {
      // Retornar erro como XML para debug
      const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<debugError>
  <success>false</success>
  <error>${result.error}</error>
  <branchId>${branchId}</branchId>
  <branchName>${branch.name}</branchName>
</debugError>`;

      return new NextResponse(errorXml, {
        status: 500,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

    const documents = result.value;
    
    // Montar XML de resposta para debug
    const xmlDebug = `<?xml version="1.0" encoding="UTF-8"?>
<debugSefazResponse>
  <totalDocuments>${documents.length}</totalDocuments>
  <branchId>${branchId}</branchId>
  <branchName>${branch.name}</branchName>
  <organizationId>${ctx.organizationId}</organizationId>
  <documents>
    ${documents.slice(0, 10).map((doc, i) => `
    <document index="${i}">
      <nsu>${doc.nsu}</nsu>
      <nfeKey>${doc.nfeKey}</nfeKey>
      <schema>${doc.schema}</schema>
      <hasXml>${doc.xml ? 'true' : 'false'}</hasXml>
    </document>`).join('')}
  </documents>
</debugSefazResponse>`;

    return new NextResponse(xmlDebug, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "X-Total-Documents": documents.length.toString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro no debug Sefaz Response:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
