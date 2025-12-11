import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches, fiscalSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
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

    console.log("\n📊 CONFIGURAÇÕES DE AMBIENTE - FILIAIS:\n");
    console.log("═══════════════════════════════════════════════════════════");
    
    report.branches.forEach((branch) => {
      console.log(`\n🏢 Filial #${branch.id}: ${branch.name}`);
      console.log(`   📄 CNPJ: ${branch.document}`);
      console.log(`   🌐 Ambiente (branches): ${branch.environment_branch}`);
      console.log(`   📋 Ambiente (fiscal_settings): ${branch.environment_settings}`);
      console.log(`   🔢 Último NSU: ${branch.lastNsu}`);
      console.log(`   📜 Certificado: ${branch.hasCertificate ? "✅" : "❌"}`);
      console.log(`   🤖 Auto-Import: ${branch.autoImport}`);
    });
    
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("\n📈 RESUMO:");
    console.log(`   • Total de Filiais: ${report.summary.total}`);
    console.log(`   • Com Certificado: ${report.summary.withCertificate}`);
    console.log(`   • Em PRODUÇÃO: ${report.summary.production}`);
    console.log(`   • Em HOMOLOGAÇÃO: ${report.summary.homologation}`);
    console.log("\n✅ Legenda:");
    console.log("   • PRODUCTION → tpAmb=1 (Produção - REAL)");
    console.log("   • HOMOLOGATION → tpAmb=2 (Homologação - TESTE)");
    console.log("   • null/undefined → tpAmb=2 (Homologação - TESTE)\n");

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}








