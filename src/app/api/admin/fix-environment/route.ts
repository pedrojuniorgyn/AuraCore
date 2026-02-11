import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🛠️ API para corrigir ambiente SEFAZ de PRODUCTION → HOMOLOGATION
 * 
 * GET /api/admin/fix-environment?branchId=1&environment=HOMOLOGATION
 */
export const GET = withDI(async (request: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const { searchParams } = new URL(request.url);
    const branchId = parseInt(searchParams.get("branchId") || "1");
    const environment = searchParams.get("environment") || "HOMOLOGATION";
    
    // Validar ambiente
    if (!["PRODUCTION", "HOMOLOGATION"].includes(environment)) {
      return NextResponse.json(
        { error: "Ambiente deve ser PRODUCTION ou HOMOLOGATION" },
        { status: 400 }
      );
    }
    
    // Buscar filial atual
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    
    if (!branch) {
      return NextResponse.json(
        { error: `Filial #${branchId} não encontrada` },
        { status: 404 }
      );
    }
    
    const oldEnvironment = branch.environment || "null";
    
    logger.info("\n🔧 CORRIGINDO AMBIENTE SEFAZ:");
    logger.info(`   🏢 Filial #${branchId}: ${branch.name}`);
    logger.info(`   📄 CNPJ: ${branch.document}`);
    logger.info(`   🔄 Mudando: ${oldEnvironment} → ${environment}`);
    
    // Atualizar ambiente
    await db
      .update(branches)
      .set({ environment })
      .where(eq(branches.id, branchId));
    
    logger.info("   ✅ Ambiente atualizado com sucesso!\n");
    
    // Buscar filial atualizada
    const [updated] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    
    return NextResponse.json({
      success: true,
      message: `Ambiente atualizado de ${oldEnvironment} para ${environment}`,
      branch: {
        id: updated.id,
        name: updated.name,
        document: updated.document,
        oldEnvironment,
        newEnvironment: updated.environment,
        tpAmb: updated.environment === "PRODUCTION" ? "1 (Produção)" : "2 (Homologação)",
        url: updated.environment === "PRODUCTION" 
          ? "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx"
          : "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao corrigir ambiente:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});































