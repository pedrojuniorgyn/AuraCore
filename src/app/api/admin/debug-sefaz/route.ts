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
 * GET /api/admin/debug-sefaz?branchId=1
 * Retorna resposta da Sefaz para debug
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

    console.log(`🔍 Debug Sefaz para branch ${branchId}`);

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
    // lastNsu = 0 para debug (buscar desde o início)
    const result = await sefazGateway.queryDistribuicaoDFe({
      cnpj,
      lastNsu: 0,
      environment: 'production',
    });

    if (Result.isFail(result)) {
      return NextResponse.json({
        success: false,
        error: result.error,
        debug: {
          branchId,
          branchName: branch.name,
          state: branch.state,
          cnpj,
        },
      }, { status: 500 });
    }

    const documents = result.value;

    // Montar resposta de debug
    return NextResponse.json({
      success: true,
      debug: {
        branchId,
        branchName: branch.name,
        state: branch.state,
        organizationId: ctx.organizationId,
        cnpj,
      },
      response: {
        totalDocuments: documents.length,
        documents: documents.slice(0, 10).map((doc, index) => ({
          index,
          nsu: doc.nsu,
          nfeKey: doc.nfeKey,
          schema: doc.schema,
          xmlPreview: doc.xml ? doc.xml.substring(0, 200) + "..." : null,
        })),
      },
      note: "Esta é uma rota de debug. Use /api/sefaz/download-nfes para importação real.",
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro no debug Sefaz:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
