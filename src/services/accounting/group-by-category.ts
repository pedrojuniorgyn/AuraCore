/**
 * 📊 AGRUPADOR DE ITENS POR CATEGORIA
 *
 * Agrupa itens da NFe por categoria contábil para criar
 * uma conta a pagar por categoria (Opção C - NCM Agrupado)
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/accounting/`
 * Use os Use Cases correspondentes via DI Container.
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { classifyNFeItems, ClassificationResult, type NFeItem } from "./classification-engine";

export interface NFeItemWithClassification {
  // Dados do item
  itemNumber: number;
  ncm: string;
  productCode: string;
  productName: string;
  ean?: string;
  cfop: string;
  cst?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // Classificação
  _classification?: ClassificationResult;
}

export interface CategoryGroup {
  // Classificação
  categoryId: number;
  categoryName: string;
  chartAccountId: number;
  chartAccountCode: string;
  chartAccountName: string;
  costCenterId: number | null;
  
  // Itens agrupados
  items: NFeItemWithClassification[];
  totalAmount: number;
  itemCount: number;
}

/**
 * Agrupa itens da NFe por categoria contábil
 * 
 * Exemplo:
 * NFe com 4 itens:
 * - 2x Diesel (NCM 2710*) → Grupo "Combustível" = R$ 5.000
 * - 1x Óleo (NCM 2710.19.*) → Grupo "Lubrificantes" = R$ 500
 * - 1x Arla (NCM 3102*) → Grupo "Aditivos" = R$ 300
 * 
 * Resultado: 3 grupos (ao invés de 1 ou 4)
 */
export async function groupItemsByCategory(
  items: NFeItemWithClassification[],
  organizationId: number,
  supplierId?: number,
  operationType: string = "PURCHASE"
): Promise<CategoryGroup[]> {
  
  // Classifica todos os itens
  const groupedMap = await classifyNFeItems(items as unknown as NFeItem[], organizationId, supplierId, operationType);
  
  const groups: CategoryGroup[] = [];
  
  for (const [categoryId, categoryItems] of groupedMap.entries()) {
    // Pega classificação do primeiro item (todos do grupo têm a mesma)
    const firstItem = categoryItems[0] as unknown as NFeItemWithClassification;
    const classification = firstItem._classification;
    
    if (!classification) {
      console.log(`⚠️  Grupo ${categoryId} sem classificação, pulando...`);
      continue;
    }
    
    // Calcula total do grupo
    const totalAmount = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    groups.push({
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      chartAccountId: classification.chartAccountId,
      chartAccountCode: classification.chartAccountCode,
      chartAccountName: classification.chartAccountName,
      costCenterId: classification.costCenterId,
      items: categoryItems as unknown as NFeItemWithClassification[],
      totalAmount,
      itemCount: categoryItems.length,
    });
  }
  
  // Ordena por valor (maior primeiro)
  groups.sort((a, b) => b.totalAmount - a.totalAmount);
  
  console.log(`📊 ${items.length} itens agrupados em ${groups.length} categorias`);
  
  for (const group of groups) {
    console.log(`   ${group.categoryName}: ${group.itemCount} item(ns) = R$ ${group.totalAmount.toFixed(2)}`);
  }
  
  return groups;
}

/**
 * Gera descrição para a conta a pagar baseado no grupo
 */
export function generatePayableDescription(
  group: CategoryGroup,
  nfeNumber: string,
  supplierName: string
): string {
  const itemText = group.itemCount === 1 ? "1 item" : `${group.itemCount} itens`;
  
  // Lista os principais produtos (max 2)
  const mainProducts = group.items.slice(0, 2).map(i => i.productName);
  const productList = mainProducts.join(" + ");
  
  if (group.items.length > 2) {
    return `NFe ${nfeNumber} - ${group.categoryName} (${productList} + outros)`;
  }
  
  return `NFe ${nfeNumber} - ${group.categoryName} (${productList})`;
}

/**
 * Gera número do documento para a conta a pagar
 */
export function generateDocumentNumber(
  nfeNumber: string,
  groupIndex: number,
  totalGroups: number
): string {
  if (totalGroups === 1) {
    return `NFe ${nfeNumber}`;
  }
  
  return `NFe ${nfeNumber}-${groupIndex + 1}`;
}






















