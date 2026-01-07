import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, getFirstRow } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * 🌱 Seed com NCMs comuns para Transporte
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // Para seed, usar organização padrão
    const organizationId = 1; // Organização padrão
    const userId = "SYSTEM"; // System user

    console.log("🌱 Iniciando seed de NCM Categories...");

    // NCMs comuns para transportadoras
    const ncmCategories = [
      // COMBUSTÍVEIS
      { ncm: "27101932", category: "Combustível", description: "Diesel S10", chartAccount: "1.1.03.001" },
      { ncm: "27101931", category: "Combustível", description: "Diesel S500", chartAccount: "1.1.03.001" },
      { ncm: "27101912", category: "Combustível", description: "Gasolina", chartAccount: "1.1.03.002" },
      { ncm: "27101929", category: "Combustível", description: "Etanol", chartAccount: "1.1.03.003" },
      
      // LUBRIFICANTES
      { ncm: "27101219", category: "Manutenção", description: "Óleo Lubrificante Mineral", chartAccount: "1.1.03.010" },
      { ncm: "27101211", category: "Manutenção", description: "Óleo de Motor", chartAccount: "1.1.03.010" },
      { ncm: "27101990", category: "Manutenção", description: "Graxa", chartAccount: "1.1.03.011" },
      
      // PNEUS E CÂMARAS
      { ncm: "40116100", category: "Manutenção", description: "Pneus para Caminhão", chartAccount: "1.1.03.020" },
      { ncm: "40116200", category: "Manutenção", description: "Pneus para Ônibus", chartAccount: "1.1.03.020" },
      { ncm: "40113000", category: "Manutenção", description: "Pneus de Borracha Maciça", chartAccount: "1.1.03.020" },
      { ncm: "40139000", category: "Manutenção", description: "Câmaras de Ar", chartAccount: "1.1.03.021" },
      
      // PEÇAS E ACESSÓRIOS
      { ncm: "87089900", category: "Manutenção", description: "Peças de Veículos", chartAccount: "1.1.03.030" },
      { ncm: "84212300", category: "Manutenção", description: "Filtros de Óleo", chartAccount: "1.1.03.031" },
      { ncm: "84213100", category: "Manutenção", description: "Filtros de Ar", chartAccount: "1.1.03.032" },
      { ncm: "84099199", category: "Manutenção", description: "Motores Diesel", chartAccount: "1.1.03.033" },
      { ncm: "85123000", category: "Manutenção", description: "Buzinas", chartAccount: "1.1.03.034" },
      { ncm: "85364900", category: "Manutenção", description: "Relés", chartAccount: "1.1.03.035" },
      { ncm: "85369090", category: "Manutenção", description: "Conectores Elétricos", chartAccount: "1.1.03.036" },
      
      // BATERIAS
      { ncm: "85071000", category: "Manutenção", description: "Baterias de Chumbo", chartAccount: "1.1.03.040" },
      
      // MATERIAL DE LIMPEZA
      { ncm: "34021900", category: "Material de Limpeza", description: "Detergentes", chartAccount: "1.1.03.050" },
      { ncm: "34022000", category: "Material de Limpeza", description: "Produtos de Limpeza", chartAccount: "1.1.03.051" },
      
      // EMBALAGENS
      { ncm: "48191000", category: "Material", description: "Caixas de Papelão", chartAccount: "1.1.03.060" },
      { ncm: "39232100", category: "Material", description: "Sacos Plásticos", chartAccount: "1.1.03.061" },
      { ncm: "39201090", category: "Material", description: "Plástico Bolha", chartAccount: "1.1.03.062" },
      { ncm: "48115900", category: "Material", description: "Fita Adesiva", chartAccount: "1.1.03.063" },
      
      // FERRAMENTAS
      { ncm: "82041100", category: "Ferramentas", description: "Chaves Combinadas", chartAccount: "1.1.03.070" },
      { ncm: "82073000", category: "Ferramentas", description: "Alicates", chartAccount: "1.1.03.071" },
      { ncm: "82054000", category: "Ferramentas", description: "Chaves de Fenda", chartAccount: "1.1.03.072" },
      
      // EQUIPAMENTOS DE SEGURANÇA
      { ncm: "39262000", category: "Segurança", description: "Equipamentos de Proteção", chartAccount: "1.1.03.080" },
      { ncm: "40151900", category: "Segurança", description: "Luvas de Borracha", chartAccount: "1.1.03.081" },
      { ncm: "62101000", category: "Segurança", description: "Roupas de Proteção", chartAccount: "1.1.03.082" },
      
      // INFORMÁTICA E ESCRITÓRIO
      { ncm: "48201000", category: "Escritório", description: "Cadernos", chartAccount: "1.1.03.090" },
      { ncm: "48209000", category: "Escritório", description: "Papéis", chartAccount: "1.1.03.091" },
      { ncm: "84713012", category: "Informática", description: "Computadores", chartAccount: "1.1.03.092" },
      { ncm: "84433210", category: "Informática", description: "Impressoras", chartAccount: "1.1.03.093" },
      
      // COMUNICAÇÃO
      { ncm: "85171231", category: "Comunicação", description: "Smartphones", chartAccount: "1.1.03.100" },
      { ncm: "85176255", category: "Comunicação", description: "Roteadores", chartAccount: "1.1.03.101" },
      
      // ALIMENTAÇÃO (Para viagens)
      { ncm: "21069090", category: "Alimentação", description: "Gêneros Alimentícios", chartAccount: "1.1.03.110" },
      { ncm: "22021000", category: "Alimentação", description: "Água Mineral", chartAccount: "1.1.03.111" },
      
      // SERVIÇOS
      { ncm: "99999999", category: "Serviços", description: "Outros Serviços", chartAccount: "1.1.03.200" },
    ];

    let created = 0;
    let skipped = 0;

    for (const item of ncmCategories) {
      try {
        // Verificar se já existe
        const existing = await db.execute(sql`
          SELECT id FROM ncm_financial_categories
          WHERE organization_id = ${organizationId}
          AND ncm_code = ${item.ncm}
          AND deleted_at IS NULL
        `);

        if (existing.recordset.length > 0) {
          skipped++;
          continue;
        }

        // Buscar categoria financeira pelo nome
        const categoryResult = await db.execute(sql`
          SELECT id FROM financial_categories
          WHERE organization_id = ${organizationId}
          AND name = ${item.category}
          AND deleted_at IS NULL
        `);

        const categoryRow = getFirstRow<{ id?: number }>(categoryResult);
        const categoryId = categoryRow?.id || null;

        // Buscar plano de contas pelo código
        const chartAccountResult = await db.execute(sql`
          SELECT id FROM chart_of_accounts
          WHERE organization_id = ${organizationId}
          AND code LIKE ${item.chartAccount + '%'}
          AND deleted_at IS NULL
        `);

        const chartAccountRow = getFirstRow<{ id?: number }>(chartAccountResult);
        const chartAccountId = chartAccountRow?.id || null;

        // Inserir
        await db.execute(sql`
          INSERT INTO ncm_financial_categories (
            organization_id,
            ncm_code,
            financial_category_id,
            chart_account_id,
            description,
            is_active,
            created_by,
            created_at,
            updated_at,
            version
          ) VALUES (
            ${organizationId},
            ${item.ncm},
            ${categoryId},
            ${chartAccountId},
            ${item.description},
            1,
            ${userId},
            GETDATE(),
            GETDATE(),
            1
          )
        `);

        created++;
      } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao criar NCM ${item.ncm}:`, errorMessage);
      }
    }

    console.log(`✅ Seed concluído: ${created} criados, ${skipped} já existiam`);

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: ncmCategories.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro no seed:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

