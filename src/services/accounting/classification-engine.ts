/**
 * 🧠 MOTOR DE CLASSIFICAÇÃO CONTÁBIL AUTOMÁTICA
 * 
 * Busca a melhor regra de classificação para um item da NFe
 * baseado em NCM, CFOP, Fornecedor, etc.
 */

import { db } from "@/lib/db";
import { autoClassificationRules, financialCategories, chartOfAccounts } from "@/lib/db/schema";
import { eq, and, or, like, isNull, asc } from "drizzle-orm";

export interface ClassificationResult {
  categoryId: number;
  categoryName: string;
  chartAccountId: number;
  chartAccountCode: string;
  chartAccountName: string;
  costCenterId: number | null;
  ruleName: string;
  matchType: string;
}

export interface NFeItem {
  ncm: string;
  cfop?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  [key: string]: any;
}

/**
 * Classifica um item da NFe baseado nas regras de classificação
 */
export async function classifyNFeItem(
  item: NFeItem,
  organizationId: number,
  supplierId?: number,
  operationType: string = "PURCHASE"
): Promise<ClassificationResult | null> {
  try {
    // Normaliza NCM (remove pontos)
    const cleanNcm = item.ncm.replace(/\D/g, "");

    // Busca regras aplicáveis (por prioridade)
    const rules = await db
      .select({
        rule: autoClassificationRules,
        category: financialCategories,
        account: chartOfAccounts,
      })
      .from(autoClassificationRules)
      .leftJoin(
        financialCategories,
        eq(autoClassificationRules.categoryId, financialCategories.id)
      )
      .leftJoin(
        chartOfAccounts,
        eq(autoClassificationRules.chartAccountId, chartOfAccounts.id)
      )
      .where(
        and(
          eq(autoClassificationRules.organizationId, organizationId),
          eq(autoClassificationRules.operationType, operationType),
          eq(autoClassificationRules.isActive, "true"),
          isNull(autoClassificationRules.deletedAt)
        )
      )
      .orderBy(asc(autoClassificationRules.priority));

    // Tenta encontrar match
    for (const { rule, category, account } of rules) {
      let matched = false;

      switch (rule.matchType) {
        case "NCM":
          // Match exato de NCM
          if (rule.ncmCode && cleanNcm === rule.ncmCode.replace(/\D/g, "")) {
            matched = true;
          }
          break;

        case "NCM_WILDCARD":
          // Match com wildcard (ex: 2710* = começa com 2710)
          if (rule.ncmCode) {
            const pattern = rule.ncmCode.replace("*", "");
            if (cleanNcm.startsWith(pattern)) {
              matched = true;
            }
          }
          break;

        case "CFOP":
          // Match por CFOP
          if (rule.cfopCode && item.cfop === rule.cfopCode) {
            matched = true;
          }
          break;

        case "SUPPLIER":
          // Match por fornecedor
          if (rule.supplierId && supplierId === rule.supplierId) {
            matched = true;
          }
          break;

        case "NCM_CFOP":
          // Match combinado NCM + CFOP
          const ncmMatch = rule.ncmCode && cleanNcm.startsWith(rule.ncmCode.replace("*", ""));
          const cfopMatch = rule.cfopCode && item.cfop === rule.cfopCode;
          if (ncmMatch && cfopMatch) {
            matched = true;
          }
          break;

        case "KEYWORD":
          // Match por palavra-chave no nome do produto
          if (rule.keyword && item.productName.toUpperCase().includes(rule.keyword.toUpperCase())) {
            matched = true;
          }
          break;
      }

      if (matched && category && account) {
        return {
          categoryId: rule.categoryId,
          categoryName: category.name,
          chartAccountId: rule.chartAccountId,
          chartAccountCode: account.code,
          chartAccountName: account.name,
          costCenterId: rule.costCenterId || null,
          ruleName: rule.name,
          matchType: rule.matchType,
        };
      }
    }

    // Se não encontrou regra, retorna null
    console.log(`⚠️  Nenhuma regra encontrada para NCM ${cleanNcm}`);
    return null;

  } catch (error: any) {
    console.error("❌ Erro ao classificar item:", error);
    return null;
  }
}

/**
 * Classifica múltiplos itens da NFe
 */
export async function classifyNFeItems(
  items: NFeItem[],
  organizationId: number,
  supplierId?: number,
  operationType: string = "PURCHASE"
): Promise<Map<number, NFeItem[]>> {
  const groupedByCategory = new Map<number, NFeItem[]>();

  for (const item of items) {
    const classification = await classifyNFeItem(item, organizationId, supplierId, operationType);

    if (classification) {
      const categoryId = classification.categoryId;

      if (!groupedByCategory.has(categoryId)) {
        groupedByCategory.set(categoryId, []);
      }

      // Adiciona classificação ao item
      const enhancedItem = {
        ...item,
        _classification: classification,
      };

      groupedByCategory.get(categoryId)!.push(enhancedItem);
    } else {
      // Se não classificou, coloca em categoria "default" (0)
      if (!groupedByCategory.has(0)) {
        groupedByCategory.set(0, []);
      }
      groupedByCategory.get(0)!.push(item);
    }
  }

  return groupedByCategory;
}

/**
 * Busca classificação padrão para operação
 */
export async function getDefaultClassification(
  organizationId: number,
  operationType: string = "PURCHASE"
): Promise<ClassificationResult | null> {
  try {
    // Busca regra de menor prioridade (maior número = fallback)
    const [result] = await db
      .select({
        rule: autoClassificationRules,
        category: financialCategories,
        account: chartOfAccounts,
      })
      .from(autoClassificationRules)
      .leftJoin(
        financialCategories,
        eq(autoClassificationRules.categoryId, financialCategories.id)
      )
      .leftJoin(
        chartOfAccounts,
        eq(autoClassificationRules.chartAccountId, chartOfAccounts.id)
      )
      .where(
        and(
          eq(autoClassificationRules.organizationId, organizationId),
          eq(autoClassificationRules.operationType, operationType),
          eq(autoClassificationRules.isActive, "true"),
          isNull(autoClassificationRules.deletedAt)
        )
      )
      .orderBy(asc(autoClassificationRules.priority))
      .limit(1);

    if (result && result.category && result.account) {
      return {
        categoryId: result.rule.categoryId,
        categoryName: result.category.name,
        chartAccountId: result.rule.chartAccountId,
        chartAccountCode: result.account.code,
        chartAccountName: result.account.name,
        costCenterId: result.rule.costCenterId || null,
        ruleName: result.rule.name + " (Padrão)",
        matchType: "DEFAULT",
      };
    }

    return null;
  } catch (error: any) {
    console.error("❌ Erro ao buscar classificação padrão:", error);
    return null;
  }
}







