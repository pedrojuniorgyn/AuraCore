import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialCategories } from "@/modules/financial/infrastructure/persistence/schemas";
import { chartOfAccounts, autoClassificationRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * 🌱 SEED: Plano de Contas e Matriz NCM para Transportadoras
 * 
 * Popula:
 * 1. Plano de Contas padrão (Chart of Accounts)
 * 2. Categorias Financeiras
 * 3. Matriz de Classificação Automática (NCM → Categoria)
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const organizationId = body.organization_id || 1;
    const userId = body.user_id || "system";

    logger.info(`🌱 Iniciando seed para organização ${organizationId}...`);

    let categoriesCreated = 0;
    let accountsCreated = 0;
    let rulesCreated = 0;

    // ===========================================
    // 1. CATEGORIAS FINANCEIRAS
    // ===========================================
    
    logger.info("📋 Criando categorias financeiras...");

    const categories = [
      // DESPESAS
      { name: "Combustível", code: "4.1.01", type: "EXPENSE" },
      { name: "Lubrificantes", code: "4.1.02", type: "EXPENSE" },
      { name: "Aditivos", code: "4.1.03", type: "EXPENSE" },
      { name: "Peças e Acessórios", code: "4.1.04", type: "EXPENSE" },
      { name: "Pneus", code: "4.1.05", type: "EXPENSE" },
      { name: "Manutenção", code: "4.1.06", type: "EXPENSE" },
      { name: "Frete Pago (Redespacho)", code: "4.2.01", type: "EXPENSE" },
      { name: "Despesas Administrativas", code: "4.3.01", type: "EXPENSE" },
      
      // RECEITAS
      { name: "Receita de Frete", code: "3.1.01", type: "INCOME" },
      { name: "Receitas Acessórias", code: "3.1.02", type: "INCOME" },
    ];

    const categoryMap: Record<string, number> = {};

    for (const cat of categories) {
      // Verifica se já existe
      const [existing] = await db
        .select()
        .from(financialCategories)
        .where(
          and(
            eq(financialCategories.organizationId, organizationId),
            eq(financialCategories.code, cat.code)
          )
        );

      if (existing) {
        categoryMap[cat.name] = existing.id;
        logger.info(`  ⏭️  Categoria "${cat.name}" já existe`);
        continue;
      }

      // Cria categoria
      await db.insert(financialCategories).values({
        organizationId,
        name: cat.name,
        code: cat.code,
        type: cat.type,
        description: `Categoria: ${cat.name}`,
        status: "ACTIVE",
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

      // Busca ID criado
      const [newCategory] = await db
        .select()
        .from(financialCategories)
        .where(
          and(
            eq(financialCategories.organizationId, organizationId),
            eq(financialCategories.code, cat.code)
          )
        );

      categoryMap[cat.name] = newCategory.id;
      categoriesCreated++;
      logger.info(`  ✅ Categoria "${cat.name}" criada (ID: ${newCategory.id})`);
    }

    // ===========================================
    // 2. PLANO DE CONTAS (Chart of Accounts)
    // ===========================================
    
    logger.info("📊 Criando plano de contas...");

    const accounts = [
      // RECEITAS
      { code: "3.1.01.001", name: "Frete - Frota Própria", type: "REVENUE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "3.1.01.002", name: "Frete - Agregados", type: "REVENUE", category: "OPERATIONAL_THIRD_PARTY", level: 3, isAnalytical: "true" },
      { code: "3.1.01.003", name: "Frete - Terceiros (Redespacho)", type: "REVENUE", category: "OPERATIONAL_THIRD_PARTY", level: 3, isAnalytical: "true" },
      { code: "3.1.02.001", name: "Taxa de Coleta/Entrega", type: "REVENUE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      
      // DESPESAS - OPERACIONAIS FROTA PRÓPRIA
      { code: "4.1.01.001", name: "Diesel S10", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.01.002", name: "Diesel S500", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.01.003", name: "Arla 32", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.02.001", name: "Óleo Motor", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.02.002", name: "Graxa e Lubrificantes", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.03.001", name: "Peças e Componentes", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.04.001", name: "Pneus", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      { code: "4.1.05.001", name: "Manutenção Mecânica", type: "EXPENSE", category: "OPERATIONAL_OWN_FLEET", level: 3, isAnalytical: "true" },
      
      // DESPESAS - OPERACIONAIS TERCEIROS
      { code: "4.2.01.001", name: "Frete Pago - Redespacho", type: "EXPENSE", category: "OPERATIONAL_THIRD_PARTY", level: 3, isAnalytical: "true" },
      { code: "4.2.01.002", name: "Frete Pago - Agregados", type: "EXPENSE", category: "OPERATIONAL_THIRD_PARTY", level: 3, isAnalytical: "true" },
      
      // DESPESAS - ADMINISTRATIVAS
      { code: "4.3.01.001", name: "Material de Escritório", type: "EXPENSE", category: "ADMINISTRATIVE", level: 3, isAnalytical: "true" },
      { code: "4.3.01.002", name: "Energia Elétrica", type: "EXPENSE", category: "ADMINISTRATIVE", level: 3, isAnalytical: "true" },
    ];

    const accountMap: Record<string, number> = {};

    for (const acc of accounts) {
      // Verifica se já existe
      const [existing] = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.organizationId, organizationId),
            eq(chartOfAccounts.code, acc.code)
          )
        );

      if (existing) {
        accountMap[acc.code] = existing.id;
        logger.info(`  ⏭️  Conta "${acc.code}" já existe`);
        continue;
      }

      // Cria conta
      await db.insert(chartOfAccounts).values({
        organizationId,
        code: acc.code,
        name: acc.name,
        description: `Plano de Contas: ${acc.name}`,
        type: acc.type,
        category: acc.category,
        level: acc.level,
        isAnalytical: acc.isAnalytical,
        acceptsCostCenter: "true",
        requiresCostCenter: "false",
        status: "ACTIVE",
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

      // Busca ID criado
      const [newAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.organizationId, organizationId),
            eq(chartOfAccounts.code, acc.code)
          )
        );

      accountMap[acc.code] = newAccount.id;
      accountsCreated++;
      logger.info(`  ✅ Conta "${acc.code} - ${acc.name}" criada (ID: ${newAccount.id})`);
    }

    // ===========================================
    // 3. MATRIZ DE CLASSIFICAÇÃO AUTOMÁTICA
    // ===========================================
    
    logger.info("🗺️  Criando matriz de classificação (NCM → Categoria)...");

    const rules = [
      // COMBUSTÍVEIS
      {
        name: "Diesel S10",
        ncmCode: "27101251",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Combustível",
        chartCode: "4.1.01.001",
        priority: 10,
      },
      {
        name: "Diesel S500",
        ncmCode: "27101259",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Combustível",
        chartCode: "4.1.01.002",
        priority: 10,
      },
      {
        name: "Diesel (Genérico)",
        ncmCode: "2710*",
        matchType: "NCM_WILDCARD",
        operationType: "PURCHASE",
        categoryName: "Combustível",
        chartCode: "4.1.01.001",
        priority: 50,
      },
      {
        name: "Arla 32 (Ureia)",
        ncmCode: "31021010",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Aditivos",
        chartCode: "4.1.01.003",
        priority: 10,
      },
      
      // LUBRIFICANTES
      {
        name: "Óleo Motor",
        ncmCode: "27101931",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Lubrificantes",
        chartCode: "4.1.02.001",
        priority: 10,
      },
      {
        name: "Graxa",
        ncmCode: "34031900",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Lubrificantes",
        chartCode: "4.1.02.002",
        priority: 10,
      },
      
      // PNEUS
      {
        name: "Pneus",
        ncmCode: "4011*",
        matchType: "NCM_WILDCARD",
        operationType: "PURCHASE",
        categoryName: "Pneus",
        chartCode: "4.1.04.001",
        priority: 10,
      },
      
      // PEÇAS
      {
        name: "Peças Veículos (8708)",
        ncmCode: "8708*",
        matchType: "NCM_WILDCARD",
        operationType: "PURCHASE",
        categoryName: "Peças e Acessórios",
        chartCode: "4.1.03.001",
        priority: 20,
      },
      {
        name: "Sistemas de Freio",
        ncmCode: "87083090",
        matchType: "NCM",
        operationType: "PURCHASE",
        categoryName: "Peças e Acessórios",
        chartCode: "4.1.03.001",
        priority: 10,
      },
      {
        name: "Filtros",
        ncmCode: "8421*",
        matchType: "NCM_WILDCARD",
        operationType: "PURCHASE",
        categoryName: "Peças e Acessórios",
        chartCode: "4.1.03.001",
        priority: 20,
      },
      {
        name: "Válvulas",
        ncmCode: "8481*",
        matchType: "NCM_WILDCARD",
        operationType: "PURCHASE",
        categoryName: "Peças e Acessórios",
        chartCode: "4.1.03.001",
        priority: 20,
      },
    ];

    for (const rule of rules) {
      const categoryId = categoryMap[rule.categoryName];
      const chartAccountId = accountMap[rule.chartCode];

      if (!categoryId || !chartAccountId) {
        logger.info(`  ⚠️  Pulando regra "${rule.name}" (categoria ou conta não encontrada)`);
        continue;
      }

      // Verifica se já existe
      const [existing] = await db
        .select()
        .from(autoClassificationRules)
        .where(
          and(
            eq(autoClassificationRules.organizationId, organizationId),
            eq(autoClassificationRules.ncmCode, rule.ncmCode),
            eq(autoClassificationRules.operationType, rule.operationType)
          )
        );

      if (existing) {
        logger.info(`  ⏭️  Regra "${rule.name}" já existe`);
        continue;
      }

      // Cria regra
      await db.insert(autoClassificationRules).values({
        organizationId,
        priority: rule.priority,
        matchType: rule.matchType,
        ncmCode: rule.ncmCode,
        operationType: rule.operationType,
        categoryId,
        chartAccountId,
        name: rule.name,
        description: `Classificação automática: ${rule.name}`,
        isActive: "true",
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

      rulesCreated++;
      logger.info(`  ✅ Regra "${rule.name}" (NCM: ${rule.ncmCode}) criada`);
    }

    logger.info("\n✅ Seed concluído!");
    logger.info(`   Categorias: ${categoriesCreated} criadas`);
    logger.info(`   Contas: ${accountsCreated} criadas`);
    logger.info(`   Regras: ${rulesCreated} criadas`);

    return NextResponse.json({
      success: true,
      message: "Seed de classificação contábil executado com sucesso!",
      summary: {
        categoriesCreated,
        accountsCreated,
        rulesCreated,
      },
    });

  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro no seed:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: (error instanceof Error ? error.stack : undefined),
      },
      { status: 500 }
    );
  }
});

