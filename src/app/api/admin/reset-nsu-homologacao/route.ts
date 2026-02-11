import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🔄 API para resetar NSU ao trocar de PRODUÇÃO → HOMOLOGAÇÃO
 * 
 * GET /api/admin/reset-nsu-homologacao?branchId=1
 */
export const GET = withDI(async (request: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const { searchParams } = new URL(request.url);
    const branchId = parseInt(searchParams.get("branchId") || "1");
    
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
    
    const oldNsu = branch.lastNsu || "0";
    const oldEnvironment = branch.environment || "null";
    
    logger.info("\n🔄 RESETANDO NSU PARA HOMOLOGAÇÃO:");
    logger.info(`   🏢 Filial #${branchId}: ${branch.name}`);
    logger.info(`   📄 CNPJ: ${branch.document}`);
    logger.info(`   🌐 Ambiente: ${oldEnvironment}`);
    logger.info(`   🔢 NSU Antigo (PRODUÇÃO): ${oldNsu}`);
    logger.info(`   🔢 NSU Novo (HOMOLOGAÇÃO): 0`);
    
    // Resetar NSU para 0
    await db
      .update(branches)
      .set({ lastNsu: "0" })
      .where(eq(branches.id, branchId));
    
    logger.info("   ✅ NSU resetado com sucesso!\n");
    
    // Buscar filial atualizada
    const [updated] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    
    return NextResponse.json({
      success: true,
      message: `NSU resetado de ${oldNsu} para 0`,
      branch: {
        id: updated.id,
        name: updated.name,
        document: updated.document,
        environment: updated.environment,
        oldNsu,
        newNsu: updated.lastNsu,
        nextImport: "Começará do NSU 0 no ambiente de HOMOLOGAÇÃO",
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao resetar NSU:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});































