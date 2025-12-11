import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 🛠️ API para corrigir ambiente SEFAZ de PRODUCTION → HOMOLOGATION
 * 
 * GET /api/admin/fix-environment?branchId=1&environment=HOMOLOGATION
 */
export async function GET(request: Request) {
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
    
    console.log("\n🔧 CORRIGINDO AMBIENTE SEFAZ:");
    console.log(`   🏢 Filial #${branchId}: ${branch.name}`);
    console.log(`   📄 CNPJ: ${branch.document}`);
    console.log(`   🔄 Mudando: ${oldEnvironment} → ${environment}`);
    
    // Atualizar ambiente
    await db
      .update(branches)
      .set({ environment })
      .where(eq(branches.id, branchId));
    
    console.log("   ✅ Ambiente atualizado com sucesso!\n");
    
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
  } catch (error: any) {
    console.error("❌ Erro ao corrigir ambiente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






