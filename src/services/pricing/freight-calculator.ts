/**
 * 🧮 FREIGHT CALCULATOR SERVICE
 * 
 * Serviço de cálculo automático de frete com suporte a:
 * - Peso Real vs Cubado (300kg/m³)
 * - Faixas de peso progressivas
 * - Componentes extras (Ad Valorem, GRIS, Despacho, etc.)
 * - Tabelas específicas por cliente ou gerais
 */

import { db } from "@/lib/db";
import { 
  freightTables, 
  freightWeightRanges, 
  freightExtraComponents 
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or, desc } from "drizzle-orm";

// ==========================================
// INTERFACES
// ==========================================

export interface FreightCalculationParams {
  organizationId: number;
  customerId?: number; // Opcional: se fornecido, busca tabela específica
  
  // Dados da Carga
  realWeight: number; // Peso real em kg
  volume?: number; // Volume em m³ (para calcular cubagem)
  invoiceValue: number; // Valor da NF (para Ad Valorem)
  
  // Rota
  originState: string; // UF origem (ex: SP)
  destinationState: string; // UF destino (ex: RJ)
  
  // Tipo de Transporte
  transportType: "FTL_LOTACAO" | "LTL_FRACIONADO";
}

export interface FreightCalculationResult {
  success: boolean;
  error?: string;
  
  // Detalhamento
  freightWeight: number; // Peso cobrado (maior entre real e cubado)
  realWeight: number;
  cubicWeight: number;
  
  // Valores Base
  baseFreight: number; // Valor base da faixa de peso
  
  // Componentes Extras
  components: {
    name: string;
    type: string;
    calculationBase: number;
    rate: number;
    value: number;
  }[];
  
  // Totais
  subtotal: number; // Base + Componentes
  total: number; // Total final
  
  // Metadata
  tableUsed: {
    id: number;
    name: string;
    type: string;
  };
}

// ==========================================
// CONSTANTES
// ==========================================

const CUBIC_WEIGHT_FACTOR = 300; // 1m³ = 300kg (padrão transporte rodoviário)

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Calcula o peso cubado
 */
function calculateCubicWeight(volume: number): number {
  return volume * CUBIC_WEIGHT_FACTOR;
}

/**
 * Define o peso cobrado (maior entre real e cubado)
 */
function getChargeableWeight(realWeight: number, volume?: number): number {
  if (!volume || volume <= 0) {
    return realWeight;
  }
  
  const cubicWeight = calculateCubicWeight(volume);
  return Math.max(realWeight, cubicWeight);
}

// ==========================================
// SERVIÇO PRINCIPAL
// ==========================================

/**
 * 🧮 CALCULAR FRETE
 * 
 * Calcula o valor total do frete aplicando:
 * 1. Peso cobrado (real vs cubado)
 * 2. Faixa de peso correta
 * 3. Componentes extras (Ad Valorem, GRIS, etc.)
 */
export async function calculateFreight(
  params: FreightCalculationParams
): Promise<FreightCalculationResult> {
  try {
    const {
      organizationId,
      customerId,
      realWeight,
      volume,
      invoiceValue,
      transportType,
    } = params;

    // ==========================================
    // 1. CALCULAR PESO COBRADO
    // ==========================================

    const cubicWeight = volume ? calculateCubicWeight(volume) : 0;
    const freightWeight = getChargeableWeight(realWeight, volume);

    // ==========================================
    // 2. BUSCAR TABELA DE FRETE ATIVA
    // ==========================================

    // Prioridade: Tabela específica do cliente > Tabela geral
    const tables = await db
      .select()
      .from(freightTables)
      .where(
        and(
          eq(freightTables.organizationId, organizationId),
          eq(freightTables.transportType, transportType),
          eq(freightTables.status, "ACTIVE"),
          isNull(freightTables.deletedAt),
          // Vigente
          lte(freightTables.validFrom, new Date()),
          or(
            isNull(freightTables.validTo),
            gte(freightTables.validTo, new Date())
          )
        )
      )
      .orderBy(desc(freightTables.type)); // CLIENT_SPECIFIC vem antes de GENERAL

    // Filtrar: Específica do cliente ou Geral
    let selectedTable = null;

    if (customerId) {
      selectedTable = tables.find(
        (t) => t.type === "CLIENT_SPECIFIC" && t.customerId === customerId
      );
    }

    if (!selectedTable) {
      selectedTable = tables.find((t) => t.type === "GENERAL");
    }

    if (!selectedTable) {
      return {
        success: false,
        error: "Nenhuma tabela de frete ativa encontrada para os critérios fornecidos.",
        freightWeight: 0,
        realWeight: 0,
        cubicWeight: 0,
        baseFreight: 0,
        components: [],
        subtotal: 0,
        total: 0,
        tableUsed: { id: 0, name: "", type: "" },
      };
    }

    // ==========================================
    // 3. BUSCAR FAIXA DE PESO CORRETA
    // ==========================================

    const weightRanges = await db
      .select()
      .from(freightWeightRanges)
      .where(
        and(
          eq(freightWeightRanges.freightTableId, selectedTable.id),
          isNull(freightWeightRanges.deletedAt)
        )
      )
      .orderBy(freightWeightRanges.minWeight);

    let selectedRange = null;

    for (const range of weightRanges) {
      const isAboveMin = freightWeight >= Number(range.minWeight);
      const isBelowMax = range.maxWeight === null || freightWeight <= Number(range.maxWeight);

      if (isAboveMin && isBelowMax) {
        selectedRange = range;
        break;
      }
    }

    if (!selectedRange) {
      return {
        success: false,
        error: `Nenhuma faixa de peso encontrada para ${freightWeight} kg.`,
        freightWeight,
        realWeight,
        cubicWeight,
        baseFreight: 0,
        components: [],
        subtotal: 0,
        total: 0,
        tableUsed: {
          id: selectedTable.id,
          name: selectedTable.name,
          type: selectedTable.type,
        },
      };
    }

    // Calcular valor base da faixa
    const baseFreight = Number(selectedRange.fixedPrice);
    
    // Calcular excedente (se houver)
    const excessWeight = freightWeight - Number(selectedRange.minWeight);
    const excessCharge = excessWeight > 0 
      ? excessWeight * Number(selectedRange.pricePerKgExceeded)
      : 0;

    const totalBaseFreight = baseFreight + excessCharge;

    // ==========================================
    // 4. BUSCAR E APLICAR COMPONENTES EXTRAS
    // ==========================================

    const extraComponents = await db
      .select()
      .from(freightExtraComponents)
      .where(
        and(
          eq(freightExtraComponents.freightTableId, selectedTable.id),
          eq(freightExtraComponents.isActive, "true"),
          isNull(freightExtraComponents.deletedAt)
        )
      )
      .orderBy(freightExtraComponents.applyOrder);

    const componentsDetail = [];
    let totalComponents = 0;

    for (const component of extraComponents) {
      let calculatedValue = 0;
      let calculationBase = 0;
      let rate = Number(component.value);

      switch (component.type) {
        case "PERCENTAGE":
          // Percentual sobre valor da NF (Ad Valorem)
          calculationBase = invoiceValue;
          calculatedValue = (invoiceValue * rate) / 100;
          break;

        case "FIXED_VALUE":
          // Valor fixo (Despacho, Pedágio)
          calculationBase = 1;
          calculatedValue = rate;
          break;

        case "PER_KG":
          // Por kg (Ex: R$ 0,50/kg)
          calculationBase = freightWeight;
          calculatedValue = freightWeight * rate;
          break;
      }

      // Aplicar valor mínimo
      if (component.minValue && calculatedValue < Number(component.minValue)) {
        calculatedValue = Number(component.minValue);
      }

      // Aplicar valor máximo
      if (component.maxValue && calculatedValue > Number(component.maxValue)) {
        calculatedValue = Number(component.maxValue);
      }

      totalComponents += calculatedValue;

      componentsDetail.push({
        name: component.name,
        type: component.type,
        calculationBase,
        rate,
        value: calculatedValue,
      });
    }

    // ==========================================
    // 5. CALCULAR TOTAIS
    // ==========================================

    const subtotal = totalBaseFreight + totalComponents;
    const total = subtotal; // Pode adicionar descontos/acréscimos aqui

    // ==========================================
    // RETORNO
    // ==========================================

    return {
      success: true,
      freightWeight,
      realWeight,
      cubicWeight,
      baseFreight: totalBaseFreight,
      components: componentsDetail,
      subtotal,
      total,
      tableUsed: {
        id: selectedTable.id,
        name: selectedTable.name,
        type: selectedTable.type,
      },
    };
  } catch (error: unknown) {
    console.error("❌ Erro ao calcular frete:", error);
    return {
      success: false,
      error: error.message || "Erro interno ao calcular frete.",
      freightWeight: 0,
      realWeight: params.realWeight,
      cubicWeight: 0,
      baseFreight: 0,
      components: [],
      subtotal: 0,
      total: 0,
      tableUsed: { id: 0, name: "", type: "" },
    };
  }
}

/**
 * 📊 SIMULAR MÚLTIPLOS CENÁRIOS
 * 
 * Útil para comparar tabelas ou pesos diferentes
 */
export async function simulateFreightScenarios(
  baseParams: FreightCalculationParams,
  scenarios: Partial<FreightCalculationParams>[]
): Promise<FreightCalculationResult[]> {
  const results: FreightCalculationResult[] = [];

  for (const scenario of scenarios) {
    const params = { ...baseParams, ...scenario };
    const result = await calculateFreight(params);
    results.push(result);
  }

  return results;
}

































