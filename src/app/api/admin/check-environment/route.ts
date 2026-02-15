import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fiscalSettings } from "@/modules/fiscal/infrastructure/persistence/schemas";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async () => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const allBranches = await db.select().from(branches);
    const allSettings = await db.select().from(fiscalSettings);
    
    const report = {
      branches: allBranches.map((branch) => {
        const settings = allSettings.find(s => s.branchId === branch.id);
        return {
          id: branch.id,
          name: branch.name,
          document: branch.document,
          environment_branch: branch.environment || "null (fallback: HOMOLOGATION)",
          environment_settings: settings?.nfeEnvironment || "não configurado",
          lastNsu: branch.lastNsu || "0",
          hasCertificate: !!branch.certificatePfx,
          autoImport: settings?.autoImportEnabled || "não configurado",
        };
      }),
      summary: {
        total: allBranches.length,
        withCertificate: allBranches.filter(b => b.certificatePfx).length,
        production: allBranches.filter(b => b.environment === "PRODUCTION").length,
        homologation: allBranches.filter(b => b.environment === "HOMOLOGATION" || !b.environment).length,
      },
    };

    logger.info("\n📊 CONFIGURAÇÕES DE AMBIENTE - FILIAIS:\n");
    logger.info("═══════════════════════════════════════════════════════════");
    
    report.branches.forEach((branch) => {
      logger.info(`\n🏢 Filial #${branch.id}: ${branch.name}`);
      logger.info(`   📄 CNPJ: ${branch.document}`);
      logger.info(`   🌐 Ambiente (branches): ${branch.environment_branch}`);
      logger.info(`   📋 Ambiente (fiscal_settings): ${branch.environment_settings}`);
      logger.info(`   🔢 Último NSU: ${branch.lastNsu}`);
      logger.info(`   📜 Certificado: ${branch.hasCertificate ? "✅" : "❌"}`);
      logger.info(`   🤖 Auto-Import: ${branch.autoImport}`);
    });
    
    logger.info("\n═══════════════════════════════════════════════════════════");
    logger.info("\n📈 RESUMO:");
    logger.info(`   • Total de Filiais: ${report.summary.total}`);
    logger.info(`   • Com Certificado: ${report.summary.withCertificate}`);
    logger.info(`   • Em PRODUÇÃO: ${report.summary.production}`);
    logger.info(`   • Em HOMOLOGAÇÃO: ${report.summary.homologation}`);
    logger.info("\n✅ Legenda:");
    logger.info("   • PRODUCTION → tpAmb=1 (Produção - REAL)");
    logger.info("   • HOMOLOGATION → tpAmb=2 (Homologação - TESTE)");
    logger.info("   • null/undefined → tpAmb=2 (Homologação - TESTE)\n");

    return NextResponse.json(report);
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});































