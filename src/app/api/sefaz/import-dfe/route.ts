import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches, nfeInbound, nfeItems, businessPartners } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * POST /api/sefaz/import-dfe
 * 
 * Importa NFes automaticamente da Sefaz via DFe (Distribuição de Documentos Fiscais Eletrônicos)
 * 
 * Funcionalidades:
 * - Consulta últimos documentos disponíveis na Sefaz
 * - Baixa XMLs compactados (GZIP)
 * - Processa e importa NFes
 * - Evita duplicatas
 * - Cria parceiros automaticamente
 * - Vincula produtos quando possível
 * 
 * Segurança:
 * - ✅ Multi-Tenant
 * - ✅ Usa certificado digital A1 da filial
 * - ✅ Valida permissões
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    const { branchId } = await request.json();

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId é obrigatório" },
        { status: 400 }
      );
    }

    // Busca a filial com certificado
    const [branch] = await db
      .select()
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
        { error: "Filial não encontrada" },
        { status: 404 }
      );
    }

    // Valida certificado
    if (!branch.certificatePfx || !branch.certificatePassword) {
      return NextResponse.json(
        {
          error: "Certificado digital não configurado",
          details: "Configure o certificado em Configurações → Certificado Digital",
        },
        { status: 400 }
      );
    }

    // Valida se certificado está válido
    if (branch.certificateExpiry && new Date(branch.certificateExpiry) < new Date()) {
      return NextResponse.json(
        {
          error: "Certificado digital expirado",
          details: `Certificado expirou em ${new Date(branch.certificateExpiry).toLocaleDateString('pt-BR')}`,
        },
        { status: 400 }
      );
    }

    console.log("📥 Iniciando importação DFe para filial:", branch.name);
    console.log("📍 NSU Atual:", branch.lastNsu || "000000000000000");

    // Importar serviço de processamento Sefaz
    const { processSefazDistribution } = await import("@/services/sefaz-service");

    // Executar consulta DFe
    const result = await processSefazDistribution({
      branchId: branch.id,
      cnpj: branch.document,
      lastNsu: branch.lastNsu || "000000000000000",
      certificatePfx: branch.certificatePfx,
      certificatePassword: branch.certificatePassword,
    });

    console.log("✅ Importação DFe concluída:", result);

    return NextResponse.json({
      success: true,
      message: "Importação concluída com sucesso!",
      totalDocuments: result.totalDocuments || 0,
      imported: result.imported || 0,
      duplicates: result.duplicates || 0,
      errors: result.errors || 0,
      maxNsu: result.maxNsu,
    });

  } catch (error: any) {
    console.error("❌ Erro ao importar DFe:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao importar da Sefaz",
        details: error.message || "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

